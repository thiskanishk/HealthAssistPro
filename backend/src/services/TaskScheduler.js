const Task = require('../models/Task');
const WorkloadBalancer = require('./workloadBalancer');
const NotificationService = require('./notificationService');
const AITaskManager = require('./aiTaskManager');
const User = require('../models/User');
const Patient = require('../models/Patient');

class TaskScheduler {
  constructor(server) {
    this.workloadBalancer = new WorkloadBalancer();
    this.notificationService = new NotificationService(server);
    this.aiTaskManager = AITaskManager;
    this.setupPeriodicChecks();
  }

  setupPeriodicChecks() {
    // Check deadlines every 15 minutes
    setInterval(() => this.checkDeadlines(), 15 * 60 * 1000);
    
    // Check workloads and predict bottlenecks every hour
    setInterval(() => this.checkWorkloadsAndBottlenecks(), 60 * 60 * 1000);
  }

  async createTask(taskData) {
    try {
      // Get available staff
      const availableStaff = await User.find({
        department: taskData.department,
        role: { $in: ['doctor', 'nurse'] },
        status: 'active'
      }).select('name specialization experience currentWorkload performanceScore');

      // Get historical performance data
      const historicalData = await Task.aggregate([
        {
          $match: {
            department: taskData.department,
            status: 'completed',
            completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          }
        },
        {
          $group: {
            _id: '$assignedTo',
            avgCompletionTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
            taskCount: { $sum: 1 },
            successRate: {
              $avg: {
                $cond: [{ $eq: ['$outcome', 'successful'] }, 1, 0]
              }
            }
          }
        }
      ]);

      // Get patient context if patient ID is provided
      let patientContext = null;
      if (taskData.patientId) {
        patientContext = await Patient.findById(taskData.patientId)
          .select('age gender medicalHistory medications allergies lastVisit');
      }

      // Get department workload
      const departmentWorkload = await this.workloadBalancer.getDepartmentWorkload(taskData.department);

      // Use AI to predict optimal assignment
      const assignmentPrediction = await this.aiTaskManager.predictOptimalAssignment(
        taskData,
        availableStaff,
        historicalData
      );

      // Use AI to predict priority and deadline
      const priorityPrediction = await this.aiTaskManager.predictTaskPriority(
        taskData,
        departmentWorkload,
        patientContext
      );

      const task = new Task({
        ...taskData,
        assignedTo: assignmentPrediction.assignedTo,
        priority: priorityPrediction.priority,
        dueDate: priorityPrediction.deadline,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          aiConfidence: assignmentPrediction.confidence,
          assignmentReasoning: assignmentPrediction.reasoning,
          priorityReasoning: priorityPrediction.reasoning,
          criticalFactors: priorityPrediction.criticalFactors,
          potentialRisks: assignmentPrediction.risks
        }
      });

      await task.save();

      // Send enhanced notification with AI insights
      await this.notificationService.sendTaskAssignment(task, assignmentPrediction.assignedTo, {
        aiInsights: {
          confidence: assignmentPrediction.confidence,
          reasoning: assignmentPrediction.reasoning,
          risks: assignmentPrediction.risks
        }
      });

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates, updatedBy) {
    try {
      const task = await Task.findById(taskId);
      if (!task) throw new Error('Task not found');

      const originalAssignee = task.assignedTo;

      // If reassignment is requested, use AI to validate the change
      if (updates.assignedTo && updates.assignedTo !== originalAssignee) {
        const availableStaff = await User.find({
          department: task.department,
          role: { $in: ['doctor', 'nurse'] },
          status: 'active'
        }).select('name specialization experience currentWorkload performanceScore');

        const historicalData = await Task.aggregate([
          {
            $match: {
              department: task.department,
              status: 'completed',
              completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: '$assignedTo',
              avgCompletionTime: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
              taskCount: { $sum: 1 },
              successRate: {
                $avg: {
                  $cond: [{ $eq: ['$outcome', 'successful'] }, 1, 0]
                }
              }
            }
          }
        ]);

        const assignmentPrediction = await this.aiTaskManager.predictOptimalAssignment(
          task,
          availableStaff,
          historicalData
        );

        // Add AI insights to the update metadata
        updates.metadata = {
          ...updates.metadata,
          aiReassignmentInsights: {
            recommendedAssignee: assignmentPrediction.assignedTo,
            confidence: assignmentPrediction.confidence,
            reasoning: assignmentPrediction.reasoning,
            risks: assignmentPrediction.risks
          }
        };
      }

      // Apply updates
      Object.assign(task, updates);
      await task.save();

      // Determine update type for notification
      let updateType = 'general';
      if (updates.status) updateType = 'status_change';
      if (updates.dueDate) updateType = 'deadline_updated';
      if (updates.priority) updateType = 'priority_change';
      if (updates.comments) updateType = 'comment_added';

      // Send update notification with AI insights if available
      await this.notificationService.sendTaskUpdate(task, updateType, updatedBy, {
        aiInsights: updates.metadata?.aiReassignmentInsights
      });

      return task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async checkWorkloadsAndBottlenecks() {
    try {
      const departments = await Task.distinct('department');
      
      for (const department of departments) {
        // Get current tasks and staff availability
        const departmentTasks = await Task.find({
          department,
          status: { $in: ['pending', 'in_progress'] }
        });

        const staffAvailability = await User.find({
          department,
          role: { $in: ['doctor', 'nurse'] },
          status: 'active'
        }).select('name role availability currentWorkload');

        const resourceUtilization = await this.workloadBalancer.getResourceUtilization(department);

        // Predict bottlenecks using AI
        const bottleneckPrediction = await this.aiTaskManager.predictBottlenecks(
          departmentTasks,
          staffAvailability,
          resourceUtilization
        );

        // Apply workload balancing if needed
        if (bottleneckPrediction.bottlenecks.some(b => b.risk === 'high')) {
          const rebalancing = await this.workloadBalancer.rebalanceDepartmentWorkload(department);
          
          // Apply rebalancing changes
          for (const change of rebalancing.changes) {
            await this.updateTask(
              change.taskId,
              { assignedTo: change.newAssignee },
              'system'
            );
          }

          // Notify department of rebalancing and predicted bottlenecks
          await this.notificationService.broadcastDepartment(department, {
            title: 'Workload Alert: AI-Predicted Bottlenecks',
            message: 'Potential bottlenecks detected. Tasks have been automatically rebalanced.',
            priority: 'high',
            metadata: {
              bottlenecks: bottleneckPrediction.bottlenecks,
              mitigationStrategies: bottleneckPrediction.mitigationStrategies,
              optimizationSuggestions: bottleneckPrediction.optimizationSuggestions,
              changesApplied: rebalancing.changes.length
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking workloads and bottlenecks:', error);
    }
  }

  async handleEmergency(emergency) {
    try {
      // Get patient context for AI analysis
      const patientContext = await Patient.findById(emergency.patientId)
        .select('age gender medicalHistory medications allergies lastVisit');

      // Get department workload for context
      const departmentWorkload = await this.workloadBalancer.getDepartmentWorkload(emergency.department);

      // Use AI to determine optimal priority and deadline
      const priorityPrediction = await this.aiTaskManager.predictTaskPriority(
        {
          type: 'emergency',
          description: emergency.description,
          patientId: emergency.patientId
        },
        departmentWorkload,
        patientContext
      );

      // Create high-priority task with AI-recommended deadline
      const task = await this.createTask({
        title: `Emergency: ${emergency.type}`,
        description: emergency.description,
        department: emergency.department,
        priority: Math.max(priorityPrediction.priority, 4), // Ensure high priority for emergencies
        category: 'emergency',
        dueDate: priorityPrediction.deadline,
        patientId: emergency.patientId,
        metadata: {
          location: emergency.location,
          vitals: emergency.vitals,
          aiPriorityReasoning: priorityPrediction.reasoning,
          criticalFactors: priorityPrediction.criticalFactors
        }
      });

      // Send emergency alert with AI insights
      await this.notificationService.sendEmergencyAlert(emergency.department, {
        message: emergency.description,
        location: emergency.location,
        patientId: emergency.patientId,
        aiInsights: {
          priorityReasoning: priorityPrediction.reasoning,
          criticalFactors: priorityPrediction.criticalFactors
        }
      });

      return task;
    } catch (error) {
      console.error('Error handling emergency:', error);
      throw error;
    }
  }
}

module.exports = TaskScheduler; 