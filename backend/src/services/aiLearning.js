const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');
const Task = require('../models/Task');
const Visit = require('../models/Visit');
const VisitTimer = require('../models/VisitTimer');
const mongoose = require('mongoose');
const aiVisualization = require('./aiVisualization');

const configuration = new Configuration({
  apiKey: config.openai.apiKey
});

const openai = new OpenAIApi(configuration);

class AILearningService {
  constructor() {
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
    this.learningCache = new Map();
    this.accuracyThreshold = 0.8; // 80% accuracy threshold
  }

  /**
   * Analyze prediction accuracy and identify patterns for improvement
   */
  async analyzePredictionAccuracy(predictionType, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      let predictions;
      let accuracyMetrics;

      switch (predictionType) {
        case 'visit_duration':
          predictions = await this.analyzeVisitDurationPredictions(startDate);
          break;
        case 'task_assignment':
          predictions = await this.analyzeTaskAssignmentPredictions(startDate);
          break;
        case 'bottleneck':
          predictions = await this.analyzeBottleneckPredictions(startDate);
          break;
        default:
          throw new Error('Invalid prediction type');
      }

      // Get AI insights on prediction patterns
      const insights = await this.getAIInsights(predictions, predictionType);

      // Update learning cache with new patterns
      this.updateLearningCache(predictionType, insights);

      return {
        accuracyMetrics: this.calculateAccuracyMetrics(predictions),
        insights,
        recommendedAdjustments: this.generateAdjustments(insights)
      };
    } catch (error) {
      console.error('Error analyzing prediction accuracy:', error);
      throw error;
    }
  }

  /**
   * Analyze visit duration predictions
   */
  async analyzeVisitDurationPredictions(startDate) {
    const visits = await VisitTimer.find({
      status: 'completed',
      actualEndTime: { $gte: startDate },
      'aiPrediction.duration': { $exists: true }
    }).select('aiPrediction actualStartTime actualEndTime patientId appointmentType complexity');

    return visits.map(visit => {
      const actualDuration = Math.round(
        (visit.actualEndTime - visit.actualStartTime) / (1000 * 60)
      );
      const predictionError = Math.abs(actualDuration - visit.aiPrediction.duration);
      const accuracy = Math.max(0, 100 - (predictionError / visit.aiPrediction.duration * 100));

      return {
        type: 'visit_duration',
        predicted: visit.aiPrediction.duration,
        actual: actualDuration,
        accuracy,
        metadata: {
          appointmentType: visit.appointmentType,
          complexity: visit.complexity,
          factors: visit.aiPrediction.factors
        }
      };
    });
  }

  /**
   * Analyze task assignment predictions
   */
  async analyzeTaskAssignmentPredictions(startDate) {
    const tasks = await Task.find({
      status: 'completed',
      completedAt: { $gte: startDate },
      'metadata.aiConfidence': { $exists: true }
    }).select('assignedTo metadata completedAt createdAt');

    return tasks.map(task => {
      const completionTime = task.completedAt - task.createdAt;
      const expectedTime = task.metadata.expectedCompletionTime || completionTime;
      const timeAccuracy = Math.max(0, 100 - (Math.abs(completionTime - expectedTime) / expectedTime * 100));

      return {
        type: 'task_assignment',
        confidence: task.metadata.aiConfidence,
        accuracy: timeAccuracy,
        metadata: {
          assignedTo: task.assignedTo,
          reasoning: task.metadata.assignmentReasoning,
          risks: task.metadata.potentialRisks
        }
      };
    });
  }

  /**
   * Analyze bottleneck predictions
   */
  async analyzeBottleneckPredictions(startDate) {
    // Aggregate department workload data
    const departmentStats = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'metadata.bottleneckPrediction': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$department',
          predictions: { $push: '$metadata.bottleneckPrediction' },
          actualBottlenecks: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } }
        }
      }
    ]);

    return departmentStats.map(dept => {
      const predictedBottlenecks = dept.predictions.filter(p => p.risk === 'high').length;
      const accuracy = Math.max(0, 100 - (Math.abs(predictedBottlenecks - dept.actualBottlenecks) / Math.max(predictedBottlenecks, dept.actualBottlenecks) * 100));

      return {
        type: 'bottleneck',
        predicted: predictedBottlenecks,
        actual: dept.actualBottlenecks,
        accuracy,
        metadata: {
          department: dept._id,
          predictions: dept.predictions
        }
      };
    });
  }

  /**
   * Get AI insights on prediction patterns
   */
  async getAIInsights(predictions, predictionType) {
    const prompt = this.formatInsightPrompt(predictions, predictionType);

    const completion = await openai.createChatCompletion({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI learning analyst. Analyze prediction patterns and outcomes 
          to identify areas for improvement and suggest adjustments to the prediction model. 
          Consider factors like prediction accuracy, consistent biases, and edge cases.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    return this.parseInsightResponse(completion.data.choices[0].message.content);
  }

  formatInsightPrompt(predictions, predictionType) {
    return `
Prediction Analysis:
Type: ${predictionType}
Sample Size: ${predictions.length}

Prediction Data:
${JSON.stringify(predictions, null, 2)}

Accuracy Distribution:
${this.calculateAccuracyDistribution(predictions)}

Please analyze and provide:
1. Identified patterns in prediction errors
2. Common factors in high-accuracy predictions
3. Edge cases requiring special handling
4. Suggested adjustments to improve accuracy
5. Confidence thresholds for different scenarios
`;
  }

  calculateAccuracyDistribution(predictions) {
    const distribution = {
      excellent: predictions.filter(p => p.accuracy >= 90).length,
      good: predictions.filter(p => p.accuracy >= 75 && p.accuracy < 90).length,
      fair: predictions.filter(p => p.accuracy >= 60 && p.accuracy < 75).length,
      poor: predictions.filter(p => p.accuracy < 60).length
    };

    return Object.entries(distribution)
      .map(([category, count]) => `${category}: ${count} (${Math.round(count / predictions.length * 100)}%)`)
      .join('\n');
  }

  parseInsightResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        errorPatterns: sections[0].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        successFactors: sections[1].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        edgeCases: sections[2].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        adjustments: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        confidenceThresholds: sections[4].split('\n').filter(line => line.startsWith('-')).reduce((obj, line) => {
          const [scenario, threshold] = line.slice(2).split(':').map(s => s.trim());
          obj[scenario] = parseInt(threshold);
          return obj;
        }, {})
      };
    } catch (error) {
      throw new Error('Failed to parse insight response');
    }
  }

  /**
   * Update learning cache with new patterns
   */
  updateLearningCache(predictionType, insights) {
    const currentPatterns = this.learningCache.get(predictionType) || [];
    const newPatterns = [...currentPatterns, insights].slice(-10); // Keep last 10 insights
    this.learningCache.set(predictionType, newPatterns);
  }

  /**
   * Calculate accuracy metrics
   */
  calculateAccuracyMetrics(predictions) {
    const accuracies = predictions.map(p => p.accuracy);
    return {
      average: accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length,
      median: accuracies.sort((a, b) => a - b)[Math.floor(accuracies.length / 2)],
      min: Math.min(...accuracies),
      max: Math.max(...accuracies),
      standardDeviation: this.calculateStandardDeviation(accuracies)
    };
  }

  calculateStandardDeviation(values) {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / values.length);
  }

  /**
   * Generate adjustment recommendations
   */
  generateAdjustments(insights) {
    const adjustments = [];

    // Adjust confidence thresholds
    for (const [scenario, threshold] of Object.entries(insights.confidenceThresholds)) {
      if (threshold > this.accuracyThreshold * 100) {
        adjustments.push({
          type: 'confidence_threshold',
          scenario,
          currentThreshold: this.accuracyThreshold,
          recommendedThreshold: threshold / 100,
          reason: `Consistent high accuracy in ${scenario} scenarios`
        });
      }
    }

    // Add pattern-based adjustments
    insights.errorPatterns.forEach(pattern => {
      adjustments.push({
        type: 'pattern_adjustment',
        pattern,
        recommendation: this.generatePatternRecommendation(pattern)
      });
    });

    // Add edge case handling
    insights.edgeCases.forEach(edgeCase => {
      adjustments.push({
        type: 'edge_case',
        case: edgeCase,
        recommendation: this.generateEdgeCaseHandler(edgeCase)
      });
    });

    return adjustments;
  }

  generatePatternRecommendation(pattern) {
    // Implement pattern-specific recommendations
    // This is a placeholder - you'd want to implement more sophisticated logic
    return {
      action: 'adjust_weights',
      factors: pattern.toLowerCase().includes('time') ? ['historical_duration', 'complexity'] : ['workload', 'expertise'],
      adjustment: 0.1
    };
  }

  generateEdgeCaseHandler(edgeCase) {
    // Implement edge case handling logic
    // This is a placeholder - you'd want to implement more sophisticated logic
    return {
      condition: edgeCase,
      handling: {
        type: 'special_case',
        adjustments: ['increase_buffer', 'add_validation']
      }
    };
  }

  /**
   * Apply learning adjustments to future predictions
   */
  async applyLearningAdjustments(predictionType, predictionData) {
    const recentInsights = this.learningCache.get(predictionType) || [];
    if (recentInsights.length === 0) return predictionData;

    // Combine insights from recent predictions
    const combinedInsights = this.combineInsights(recentInsights);

    // Apply adjustments based on learned patterns
    return this.adjustPrediction(predictionData, combinedInsights);
  }

  combineInsights(insights) {
    // Implement logic to combine multiple insights
    // This is a placeholder - you'd want to implement more sophisticated logic
    return insights.reduce((combined, insight) => {
      combined.errorPatterns.push(...insight.errorPatterns);
      combined.successFactors.push(...insight.successFactors);
      combined.confidenceThresholds = { ...combined.confidenceThresholds, ...insight.confidenceThresholds };
      return combined;
    }, { errorPatterns: [], successFactors: [], confidenceThresholds: {} });
  }

  adjustPrediction(predictionData, insights) {
    // Implement logic to adjust predictions based on insights
    // This is a placeholder - you'd want to implement more sophisticated logic
    let adjusted = { ...predictionData };

    // Apply confidence adjustments
    if (insights.confidenceThresholds[predictionData.type]) {
      adjusted.confidence *= insights.confidenceThresholds[predictionData.type];
    }

    // Apply pattern-based adjustments
    insights.errorPatterns.forEach(pattern => {
      const adjustment = this.generatePatternRecommendation(pattern);
      adjusted = this.applyAdjustment(adjusted, adjustment);
    });

    return adjusted;
  }

  applyAdjustment(prediction, adjustment) {
    // Implement specific adjustment logic
    // This is a placeholder - you'd want to implement more sophisticated logic
    switch (adjustment.action) {
      case 'adjust_weights':
        adjustment.factors.forEach(factor => {
          if (prediction[factor]) {
            prediction[factor] *= (1 + adjustment.adjustment);
          }
        });
        break;
      // Add more adjustment types as needed
    }
    return prediction;
  }

  /**
   * Process and store feedback for continuous learning
   */
  async processFeedback(predictionType, feedbackData) {
    try {
      // Store feedback in database
      const feedback = new AIFeedback({
        predictionType,
        actualOutcome: feedbackData.actualOutcome,
        predictedOutcome: feedbackData.predictedOutcome,
        accuracy: feedbackData.accuracy,
        userFeedback: feedbackData.userFeedback,
        context: feedbackData.context,
        timestamp: new Date()
      });
      await feedback.save();

      // Analyze recent feedback patterns
      const recentFeedback = await AIFeedback.find({
        predictionType,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).sort('-timestamp');

      // Generate feedback analysis
      const analysis = await this.analyzeFeedbackPatterns(recentFeedback);

      // Update learning parameters based on feedback
      await this.updateLearningParameters(predictionType, analysis);

      // Generate visualization report
      const report = await aiVisualization.generateAnalyticsReport(
        predictionType,
        recentFeedback,
        analysis.insights,
        analysis.metrics,
        this.learningCache.get(predictionType) || []
      );

      return {
        feedbackId: feedback._id,
        analysis,
        report
      };
    } catch (error) {
      console.error('Error processing feedback:', error);
      throw error;
    }
  }

  /**
   * Analyze feedback patterns for insights
   */
  async analyzeFeedbackPatterns(feedback) {
    const prompt = this.formatFeedbackAnalysisPrompt(feedback);

    const completion = await openai.createChatCompletion({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI feedback analysis specialist. Analyze user feedback and 
          prediction outcomes to identify patterns, improvement opportunities, and potential 
          adjustments to the prediction model.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    return this.parseFeedbackAnalysis(completion.data.choices[0].message.content);
  }

  formatFeedbackAnalysisPrompt(feedback) {
    return `
Feedback Analysis Request:
Sample Size: ${feedback.length}

Recent Feedback:
${feedback.map(f => `
- Prediction Type: ${f.predictionType}
  Accuracy: ${f.accuracy}%
  User Feedback: ${f.userFeedback}
  Context: ${JSON.stringify(f.context)}
`).join('\n')}

Please analyze and provide:
1. Common patterns in accurate predictions
2. Common patterns in inaccurate predictions
3. User feedback themes
4. Suggested model adjustments
5. Priority areas for improvement
`;
  }

  parseFeedbackAnalysis(response) {
    try {
      const sections = response.split('\n\n');
      return {
        accuratePatterns: sections[0].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        inaccuratePatterns: sections[1].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        feedbackThemes: sections[2].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        suggestedAdjustments: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        priorityAreas: sections[4].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse feedback analysis');
    }
  }

  /**
   * Update learning parameters based on feedback analysis
   */
  async updateLearningParameters(predictionType, analysis) {
    // Get current parameters
    const currentParams = await AILearningParameters.findOne({ predictionType });
    
    // Generate parameter adjustments based on analysis
    const adjustments = this.generateParameterAdjustments(analysis);

    // Apply adjustments to parameters
    const updatedParams = {
      ...currentParams,
      weights: this.applyWeightAdjustments(currentParams.weights, adjustments.weightAdjustments),
      thresholds: this.applyThresholdAdjustments(currentParams.thresholds, adjustments.thresholdAdjustments),
      factors: this.updateFactorImportance(currentParams.factors, adjustments.factorAdjustments)
    };

    // Save updated parameters
    await AILearningParameters.findOneAndUpdate(
      { predictionType },
      updatedParams,
      { upsert: true }
    );

    // Log parameter updates for tracking
    await this.logParameterUpdate(predictionType, currentParams, updatedParams);

    return updatedParams;
  }

  generateParameterAdjustments(analysis) {
    const adjustments = {
      weightAdjustments: {},
      thresholdAdjustments: {},
      factorAdjustments: {}
    };

    // Process accurate patterns to increase weights
    analysis.accuratePatterns.forEach(pattern => {
      const factor = this.extractFactorFromPattern(pattern);
      if (factor) {
        adjustments.weightAdjustments[factor] = (adjustments.weightAdjustments[factor] || 0) + 0.1;
      }
    });

    // Process inaccurate patterns to decrease weights
    analysis.inaccuratePatterns.forEach(pattern => {
      const factor = this.extractFactorFromPattern(pattern);
      if (factor) {
        adjustments.weightAdjustments[factor] = (adjustments.weightAdjustments[factor] || 0) - 0.1;
      }
    });

    // Adjust thresholds based on feedback themes
    analysis.feedbackThemes.forEach(theme => {
      const threshold = this.extractThresholdFromTheme(theme);
      if (threshold) {
        adjustments.thresholdAdjustments[threshold.name] = threshold.adjustment;
      }
    });

    // Update factor importance based on priority areas
    analysis.priorityAreas.forEach(area => {
      const factor = this.extractFactorFromArea(area);
      if (factor) {
        adjustments.factorAdjustments[factor] = true;
      }
    });

    return adjustments;
  }

  applyWeightAdjustments(currentWeights, adjustments) {
    const updatedWeights = { ...currentWeights };
    
    Object.entries(adjustments).forEach(([factor, adjustment]) => {
      updatedWeights[factor] = Math.max(0, Math.min(1, (updatedWeights[factor] || 0.5) + adjustment));
    });

    return updatedWeights;
  }

  applyThresholdAdjustments(currentThresholds, adjustments) {
    const updatedThresholds = { ...currentThresholds };
    
    Object.entries(adjustments).forEach(([name, adjustment]) => {
      updatedThresholds[name] = Math.max(0, Math.min(1, (updatedThresholds[name] || 0.5) + adjustment));
    });

    return updatedThresholds;
  }

  updateFactorImportance(currentFactors, adjustments) {
    const updatedFactors = [...currentFactors];
    
    Object.keys(adjustments).forEach(factor => {
      if (!updatedFactors.includes(factor)) {
        updatedFactors.push(factor);
      }
    });

    return updatedFactors;
  }

  async logParameterUpdate(predictionType, oldParams, newParams) {
    const update = new AIParameterUpdate({
      predictionType,
      oldParams,
      newParams,
      timestamp: new Date(),
      changes: this.calculateParameterChanges(oldParams, newParams)
    });

    await update.save();
  }

  calculateParameterChanges(oldParams, newParams) {
    const changes = [];

    // Compare weights
    Object.entries(newParams.weights).forEach(([factor, weight]) => {
      const oldWeight = oldParams.weights[factor];
      if (weight !== oldWeight) {
        changes.push({
          type: 'weight',
          factor,
          oldValue: oldWeight,
          newValue: weight,
          difference: weight - oldWeight
        });
      }
    });

    // Compare thresholds
    Object.entries(newParams.thresholds).forEach(([name, threshold]) => {
      const oldThreshold = oldParams.thresholds[name];
      if (threshold !== oldThreshold) {
        changes.push({
          type: 'threshold',
          name,
          oldValue: oldThreshold,
          newValue: threshold,
          difference: threshold - oldThreshold
        });
      }
    });

    // Compare factors
    const addedFactors = newParams.factors.filter(f => !oldParams.factors.includes(f));
    const removedFactors = oldParams.factors.filter(f => !newParams.factors.includes(f));

    addedFactors.forEach(factor => {
      changes.push({
        type: 'factor',
        action: 'added',
        factor
      });
    });

    removedFactors.forEach(factor => {
      changes.push({
        type: 'factor',
        action: 'removed',
        factor
      });
    });

    return changes;
  }

  extractFactorFromPattern(pattern) {
    // Implement pattern analysis logic
    // This is a placeholder - you'd want to implement more sophisticated logic
    const commonFactors = ['time', 'workload', 'complexity', 'urgency', 'expertise'];
    return commonFactors.find(factor => pattern.toLowerCase().includes(factor));
  }

  extractThresholdFromTheme(theme) {
    // Implement theme analysis logic
    // This is a placeholder - you'd want to implement more sophisticated logic
    const thresholdPatterns = {
      confidence: /confidence.*?(increased|decreased)/i,
      accuracy: /accuracy.*?(higher|lower)/i,
      urgency: /urgency.*?(high|low)/i
    };

    for (const [name, pattern] of Object.entries(thresholdPatterns)) {
      const match = theme.match(pattern);
      if (match) {
        const isPositive = match[1].match(/increased|higher/i);
        return {
          name,
          adjustment: isPositive ? 0.1 : -0.1
        };
      }
    }

    return null;
  }

  extractFactorFromArea(area) {
    // Implement area analysis logic
    // This is a placeholder - you'd want to implement more sophisticated logic
    const factorPatterns = {
      time_management: /time|duration|schedule/i,
      resource_allocation: /resource|allocation|capacity/i,
      skill_matching: /skill|expertise|specialization/i,
      workload_balance: /workload|balance|distribution/i
    };

    return Object.entries(factorPatterns)
      .find(([_, pattern]) => area.match(pattern))?.[0];
  }
}

module.exports = new AILearningService(); 