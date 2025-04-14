const Task = require('../models/Task');
const User = require('../models/User');
const TaskAnalyticsService = require('./taskAnalytics');

class WorkloadBalancerService {
  /**
   * Calculate user workload score based on various factors
   */
  static async calculateUserWorkloadScore(userId, department) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // Get user's current tasks and metrics
    const [activeTasks, userMetrics] = await Promise.all([
      Task.find({
        assignedTo: userId,
        status: { $ne: 'completed' },
        department
      }),
      TaskAnalyticsService.getUserMetrics(userId, thirtyDaysAgo, now)
    ]);

    // Calculate base workload from active tasks
    const baseWorkload = activeTasks.reduce((total, task) => {
      const priorityWeights = { high: 3, medium: 2, low: 1 };
      const urgencyWeights = { emergency: 3, urgent: 2, routine: 1 };
      
      return total + (
        (priorityWeights[task.priority] || 1) *
        (urgencyWeights[task.urgencyLevel] || 1) *
        (task.estimatedDuration / 60) // Convert to hours
      );
    }, 0);

    // Factor in performance metrics
    const performanceScore = (
      (userMetrics.performance.completionRate / 100) +
      (userMetrics.performance.onTimeCompletionRate / 100)
    ) / 2;

    // Calculate final workload score
    const workloadScore = {
      raw: baseWorkload,
      weighted: baseWorkload / (performanceScore || 1),
      metrics: {
        activeTasks: activeTasks.length,
        totalEstimatedHours: baseWorkload,
        performanceScore,
        overdueTasks: activeTasks.filter(t => t.isOverdue).length
      }
    };

    return workloadScore;
  }

  /**
   * Find optimal assignee for a task
   */
  static async findOptimalAssignee(task, department, excludeUsers = []) {
    // Get all eligible users in the department
    const eligibleUsers = await User.find({
      department,
      roles: { $in: ['doctor', 'nurse'] },
      _id: { $nin: excludeUsers },
      isActive: true
    });

    // Calculate workload scores for all eligible users
    const userWorkloads = await Promise.all(
      eligibleUsers.map(async user => {
        const workloadScore = await this.calculateUserWorkloadScore(user._id, department);
        return {
          userId: user._id,
          name: user.name,
          roles: user.roles,
          workloadScore,
          specialties: user.specialties || []
        };
      })
    );

    // Calculate assignment scores based on multiple factors
    const assignmentScores = userWorkloads.map(userWorkload => {
      let score = 0;

      // Factor 1: Inverse workload score (lower workload = higher score)
      const workloadFactor = 1 / (userWorkload.workloadScore.weighted + 1);
      score += workloadFactor * 40; // 40% weight

      // Factor 2: Role suitability
      const roleSuitability = this.calculateRoleSuitability(userWorkload.roles, task);
      score += roleSuitability * 30; // 30% weight

      // Factor 3: Specialty match
      const specialtyMatch = this.calculateSpecialtyMatch(userWorkload.specialties, task);
      score += specialtyMatch * 30; // 30% weight

      return {
        ...userWorkload,
        assignmentScore: score
      };
    });

    // Sort by assignment score and return the best match
    assignmentScores.sort((a, b) => b.assignmentScore - a.assignmentScore);
    return assignmentScores[0] || null;
  }

  /**
   * Calculate role suitability score
   */
  static calculateRoleSuitability(userRoles, task) {
    const roleWeights = {
      doctor: {
        patient_care: 1.0,
        medication: 1.0,
        consultation: 1.0,
        lab: 0.8,
        admin: 0.6
      },
      nurse: {
        patient_care: 1.0,
        medication: 0.9,
        lab: 1.0,
        consultation: 0.7,
        admin: 0.8
      }
    };

    const highestRoleScore = userRoles.reduce((highest, role) => {
      const roleScore = roleWeights[role]?.[task.category] || 0.5;
      return Math.max(highest, roleScore);
    }, 0);

    return highestRoleScore;
  }

  /**
   * Calculate specialty match score
   */
  static calculateSpecialtyMatch(userSpecialties, task) {
    if (!userSpecialties || userSpecialties.length === 0) return 0.5;
    if (!task.specialtyTags || task.specialtyTags.length === 0) return 0.7;

    const matchingSpecialties = task.specialtyTags.filter(tag =>
      userSpecialties.includes(tag)
    );

    return matchingSpecialties.length > 0
      ? 0.7 + (0.3 * (matchingSpecialties.length / task.specialtyTags.length))
      : 0.5;
  }

  /**
   * Rebalance workload across department
   */
  static async rebalanceDepartmentWorkload(department) {
    const overloadedThreshold = 40; // 40 hours of weighted workload
    const tasks = await Task.find({
      department,
      status: { $ne: 'completed' }
    }).sort({ priority: -1, urgencyLevel: -1 });

    const users = await User.find({
      department,
      roles: { $in: ['doctor', 'nurse'] },
      isActive: true
    });

    const workloadMap = new Map();
    for (const user of users) {
      workloadMap.set(
        user._id.toString(),
        await this.calculateUserWorkloadScore(user._id, department)
      );
    }

    const reassignments = [];
    for (const user of users) {
      const workload = workloadMap.get(user._id.toString());
      
      if (workload.weighted > overloadedThreshold) {
        // Find tasks that can be reassigned
        const userTasks = tasks.filter(t => 
          t.assignedTo?.toString() === user._id.toString()
        );

        for (const task of userTasks) {
          // Find a better assignee
          const optimalAssignee = await this.findOptimalAssignee(
            task,
            department,
            [user._id]
          );

          if (optimalAssignee && 
              optimalAssignee.workloadScore.weighted < workload.weighted - 10) {
            reassignments.push({
              taskId: task._id,
              fromUser: user._id,
              toUser: optimalAssignee.userId,
              reason: 'workload_balancing',
              workloadDiff: workload.weighted - optimalAssignee.workloadScore.weighted
            });

            // Update workload scores
            const taskWeight = this.calculateTaskWeight(task);
            workload.weighted -= taskWeight;
            optimalAssignee.workloadScore.weighted += taskWeight;
          }

          // Stop if workload is no longer above threshold
          if (workload.weighted <= overloadedThreshold) break;
        }
      }
    }

    return reassignments;
  }

  /**
   * Calculate task weight for workload calculations
   */
  static calculateTaskWeight(task) {
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    const urgencyWeights = { emergency: 3, urgent: 2, routine: 1 };
    
    return (
      (priorityWeights[task.priority] || 1) *
      (urgencyWeights[task.urgencyLevel] || 1) *
      (task.estimatedDuration / 60)
    );
  }

  /**
   * Apply workload rebalancing
   */
  static async applyRebalancing(department) {
    const reassignments = await this.rebalanceDepartmentWorkload(department);
    
    const results = await Promise.all(reassignments.map(async reassignment => {
      try {
        const task = await Task.findById(reassignment.taskId);
        if (!task) return null;

        const oldAssignee = task.assignedTo;
        task.assignedTo = reassignment.toUser;
        task.addHistoryEntry('reassigned', reassignment.toUser, {
          from: oldAssignee,
          to: reassignment.toUser,
          reason: reassignment.reason,
          workloadDiff: reassignment.workloadDiff
        });

        await task.save();
        return {
          success: true,
          taskId: task._id,
          reassignment
        };
      } catch (error) {
        console.error(`Error reassigning task ${reassignment.taskId}:`, error);
        return {
          success: false,
          taskId: reassignment.taskId,
          error: error.message
        };
      }
    }));

    return {
      totalReassignments: reassignments.length,
      successfulReassignments: results.filter(r => r && r.success).length,
      failedReassignments: results.filter(r => r && !r.success).length,
      details: results.filter(Boolean)
    };
  }
}

module.exports = WorkloadBalancerService; 