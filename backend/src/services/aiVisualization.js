const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs').promises;
const path = require('path');

class AIVisualizationService {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ width: this.width, height: this.height });
    this.outputDir = path.join(__dirname, '../public/analytics');
  }

  /**
   * Generate accuracy trend visualization
   */
  async generateAccuracyTrendChart(predictions, predictionType) {
    const chartData = {
      type: 'line',
      data: {
        labels: predictions.map((_, index) => `Day ${index + 1}`),
        datasets: [{
          label: 'Prediction Accuracy',
          data: predictions.map(p => p.accuracy),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${predictionType} Prediction Accuracy Trend`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };

    const buffer = await this.chartJSNodeCanvas.renderToBuffer(chartData);
    const filename = `accuracy_trend_${predictionType}_${Date.now()}.png`;
    await this.saveChart(buffer, filename);
    return filename;
  }

  /**
   * Generate error pattern distribution visualization
   */
  async generateErrorPatternChart(insights) {
    const patterns = {};
    insights.errorPatterns.forEach(pattern => {
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });

    const chartData = {
      type: 'bar',
      data: {
        labels: Object.keys(patterns),
        datasets: [{
          label: 'Error Pattern Frequency',
          data: Object.values(patterns),
          backgroundColor: 'rgb(255, 99, 132)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Error Pattern Distribution'
          }
        }
      }
    };

    const buffer = await this.chartJSNodeCanvas.renderToBuffer(chartData);
    const filename = `error_patterns_${Date.now()}.png`;
    await this.saveChart(buffer, filename);
    return filename;
  }

  /**
   * Generate confidence threshold comparison visualization
   */
  async generateConfidenceComparisonChart(insights) {
    const chartData = {
      type: 'radar',
      data: {
        labels: Object.keys(insights.confidenceThresholds),
        datasets: [{
          label: 'Current Thresholds',
          data: Object.values(insights.confidenceThresholds),
          fill: true,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        }]
      },
      options: {
        elements: {
          line: {
            borderWidth: 3
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Confidence Thresholds by Scenario'
          }
        }
      }
    };

    const buffer = await this.chartJSNodeCanvas.renderToBuffer(chartData);
    const filename = `confidence_comparison_${Date.now()}.png`;
    await this.saveChart(buffer, filename);
    return filename;
  }

  /**
   * Generate performance metrics dashboard
   */
  async generatePerformanceDashboard(metrics, predictionType) {
    const chartData = {
      type: 'bar',
      data: {
        labels: ['Average', 'Median', 'Min', 'Max', 'Std Dev'],
        datasets: [{
          label: 'Performance Metrics',
          data: [
            metrics.average,
            metrics.median,
            metrics.min,
            metrics.max,
            metrics.standardDeviation
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(153, 102, 255, 0.5)',
            'rgba(255, 159, 64, 0.5)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${predictionType} Performance Metrics`
          }
        }
      }
    };

    const buffer = await this.chartJSNodeCanvas.renderToBuffer(chartData);
    const filename = `performance_dashboard_${predictionType}_${Date.now()}.png`;
    await this.saveChart(buffer, filename);
    return filename;
  }

  /**
   * Generate learning progress visualization
   */
  async generateLearningProgressChart(learningCache, predictionType) {
    const accuracyTrends = learningCache.map(insight => {
      const accuracies = insight.successFactors.length / 
        (insight.successFactors.length + insight.errorPatterns.length) * 100;
      return accuracies;
    });

    const chartData = {
      type: 'line',
      data: {
        labels: accuracyTrends.map((_, index) => `Iteration ${index + 1}`),
        datasets: [{
          label: 'Learning Progress',
          data: accuracyTrends,
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${predictionType} Learning Progress`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };

    const buffer = await this.chartJSNodeCanvas.renderToBuffer(chartData);
    const filename = `learning_progress_${predictionType}_${Date.now()}.png`;
    await this.saveChart(buffer, filename);
    return filename;
  }

  /**
   * Save chart buffer to file
   */
  async saveChart(buffer, filename) {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.writeFile(path.join(this.outputDir, filename), buffer);
    } catch (error) {
      console.error('Error saving chart:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateAnalyticsReport(predictionType, predictions, insights, metrics, learningCache) {
    const charts = await Promise.all([
      this.generateAccuracyTrendChart(predictions, predictionType),
      this.generateErrorPatternChart(insights),
      this.generateConfidenceComparisonChart(insights),
      this.generatePerformanceDashboard(metrics, predictionType),
      this.generateLearningProgressChart(learningCache, predictionType)
    ]);

    return {
      predictionType,
      timestamp: new Date(),
      charts,
      summary: {
        totalPredictions: predictions.length,
        averageAccuracy: metrics.average,
        topErrorPatterns: insights.errorPatterns.slice(0, 3),
        keySuccessFactors: insights.successFactors.slice(0, 3),
        recentImprovements: this.calculateRecentImprovements(learningCache)
      }
    };
  }

  calculateRecentImprovements(learningCache) {
    if (learningCache.length < 2) return [];
    
    const recent = learningCache[learningCache.length - 1];
    const previous = learningCache[learningCache.length - 2];
    
    const improvements = [];
    
    // Compare confidence thresholds
    Object.entries(recent.confidenceThresholds).forEach(([scenario, threshold]) => {
      const previousThreshold = previous.confidenceThresholds[scenario];
      if (threshold > previousThreshold) {
        improvements.push(`Improved confidence in ${scenario} scenarios by ${(threshold - previousThreshold).toFixed(1)}%`);
      }
    });

    // Compare error patterns
    const recentErrorCount = recent.errorPatterns.length;
    const previousErrorCount = previous.errorPatterns.length;
    if (recentErrorCount < previousErrorCount) {
      improvements.push(`Reduced error patterns from ${previousErrorCount} to ${recentErrorCount}`);
    }

    return improvements;
  }
}

module.exports = new AIVisualizationService(); 