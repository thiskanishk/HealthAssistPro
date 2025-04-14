const Task = require('../models/Task');
const TaskTemplate = require('../models/TaskTemplate');
const TaskScheduler = require('../models/TaskScheduler');

class TaskAnalyticsService {
  /**
   * Get department performance metrics
   */
  static async getDepartmentMetrics(department, startDate, endDate) {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const [tasks, templates, schedulers] = await Promise.all([
      Task.find({ department, ...dateFilter }),
      TaskTemplate.find({ department, isActive: true }),
      TaskScheduler.find({ department, isActive: true })
    ]);

    // Calculate completion rate
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const completionRate = (completedTasks.length / tasks.length) * 100 || 0;

    // Calculate average completion time
    const completionTimes = completedTasks.map(task => {
      const created = new Date(task.createdAt);
      const completed = task.history.find(h => h.action === 'completed')?.timestamp;
      return completed ? (completed - created) / (1000 * 60 * 60) : null; // Convert to hours
    }).filter(Boolean);

    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // Calculate overdue rate
    const overdueTasks = tasks.filter(task => task.isOverdue);
    const overdueRate = (overdueTasks.length / tasks.length) * 100 || 0;

    // Calculate task distribution by category
    const categoryDistribution = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    // Calculate priority distribution
    const priorityDistribution = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    // Calculate template usage
    const templateUsage = tasks.reduce((acc, task) => {
      if (task.templateId) {
        acc[task.templateId.toString()] = (acc[task.templateId.toString()] || 0) + 1;
      }
      return acc;
    }, {});

    // Calculate scheduler efficiency
    const schedulerMetrics = await this.getSchedulerMetrics(schedulers);

    return {
      overview: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        activeTasks: tasks.filter(t => t.status !== 'completed').length,
        overdueTasks: overdueTasks.length,
        activeTemplates: templates.length,
        activeSchedulers: schedulers.length
      },
      performance: {
        completionRate,
        avgCompletionTime,
        overdueRate
      },
      distribution: {
        byCategory: categoryDistribution,
        byPriority: priorityDistribution,
        byTemplate: templateUsage
      },
      schedulerMetrics,
      trends: await this.calculateTrends(tasks, startDate, endDate)
    };
  }

  /**
   * Get scheduler performance metrics
   */
  static async getSchedulerMetrics(schedulers) {
    const metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      skippedExecutions: 0,
      avgExecutionDelay: 0
    };

    let totalDelay = 0;
    let delayCount = 0;

    schedulers.forEach(scheduler => {
      scheduler.executionHistory.forEach(execution => {
        metrics.totalExecutions++;
        metrics[`${execution.status}Executions`]++;

        if (execution.actualExecutionTime && execution.scheduledTime) {
          const delay = (execution.actualExecutionTime - execution.scheduledTime) / (1000 * 60); // minutes
          totalDelay += delay;
          delayCount++;
        }
      });
    });

    metrics.avgExecutionDelay = delayCount > 0 ? totalDelay / delayCount : 0;
    metrics.executionSuccessRate = (metrics.successfulExecutions / metrics.totalExecutions) * 100 || 0;

    return metrics;
  }

  /**
   * Calculate task trends over time
   */
  static async calculateTrends(tasks, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const dailyStats = Array(days).fill(null).map((_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        date: date.toISOString().split('T')[0],
        created: 0,
        completed: 0,
        overdue: 0
      };
    });

    // Calculate daily statistics
    tasks.forEach(task => {
      const createdIndex = Math.floor((new Date(task.createdAt) - start) / (1000 * 60 * 60 * 24));
      if (createdIndex >= 0 && createdIndex < days) {
        dailyStats[createdIndex].created++;
      }

      const completedHistory = task.history.find(h => h.action === 'completed');
      if (completedHistory) {
        const completedIndex = Math.floor((new Date(completedHistory.timestamp) - start) / (1000 * 60 * 60 * 24));
        if (completedIndex >= 0 && completedIndex < days) {
          dailyStats[completedIndex].completed++;
        }
      }

      if (task.isOverdue) {
        const dueIndex = Math.floor((new Date(task.dueDate) - start) / (1000 * 60 * 60 * 24));
        if (dueIndex >= 0 && dueIndex < days) {
          dailyStats[dueIndex].overdue++;
        }
      }
    });

    // Calculate moving averages
    const windowSize = 7; // 7-day moving average
    const movingAverages = dailyStats.map((day, index) => {
      if (index < windowSize - 1) return day;

      const window = dailyStats.slice(index - windowSize + 1, index + 1);
      return {
        date: day.date,
        createdAvg: window.reduce((sum, d) => sum + d.created, 0) / windowSize,
        completedAvg: window.reduce((sum, d) => sum + d.completed, 0) / windowSize,
        overdueAvg: window.reduce((sum, d) => sum + d.overdue, 0) / windowSize
      };
    });

    return {
      daily: dailyStats,
      movingAverages
    };
  }

  /**
   * Get user performance metrics
   */
  static async getUserMetrics(userId, startDate, endDate) {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const tasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ],
      ...dateFilter
    });

    const assignedTasks = tasks.filter(task => task.assignedTo?.toString() === userId);
    const createdTasks = tasks.filter(task => task.createdBy.toString() === userId);

    return {
      overview: {
        totalAssigned: assignedTasks.length,
        totalCreated: createdTasks.length,
        completedTasks: assignedTasks.filter(t => t.status === 'completed').length,
        overdueTasks: assignedTasks.filter(t => t.isOverdue).length
      },
      performance: {
        completionRate: (assignedTasks.filter(t => t.status === 'completed').length / assignedTasks.length) * 100 || 0,
        avgCompletionTime: this.calculateAverageCompletionTime(assignedTasks),
        onTimeCompletionRate: this.calculateOnTimeCompletionRate(assignedTasks)
      },
      taskDistribution: {
        byCategory: this.getDistributionByField(assignedTasks, 'category'),
        byPriority: this.getDistributionByField(assignedTasks, 'priority'),
        byStatus: this.getDistributionByField(assignedTasks, 'status')
      }
    };
  }

  /**
   * Helper method to calculate average completion time
   */
  static calculateAverageCompletionTime(tasks) {
    const completionTimes = tasks
      .filter(task => task.status === 'completed')
      .map(task => {
        const completedHistory = task.history.find(h => h.action === 'completed');
        return completedHistory
          ? (new Date(completedHistory.timestamp) - new Date(task.createdAt)) / (1000 * 60 * 60)
          : null;
      })
      .filter(Boolean);

    return completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;
  }

  /**
   * Helper method to calculate on-time completion rate
   */
  static calculateOnTimeCompletionRate(tasks) {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    if (completedTasks.length === 0) return 0;

    const onTimeTasks = completedTasks.filter(task => {
      const completedHistory = task.history.find(h => h.action === 'completed');
      return completedHistory && new Date(completedHistory.timestamp) <= new Date(task.dueDate);
    });

    return (onTimeTasks.length / completedTasks.length) * 100;
  }

  /**
   * Helper method to get distribution by field
   */
  static getDistributionByField(tasks, field) {
    return tasks.reduce((acc, task) => {
      acc[task[field]] = (acc[task[field]] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = TaskAnalyticsService; 