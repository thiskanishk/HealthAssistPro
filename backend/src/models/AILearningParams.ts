import mongoose, { Document, Schema, Model } from 'mongoose';
import { PredictionType } from './AIFeedback';

interface IThresholds {
    confidence: number;
    accuracy: number;
    errorTolerance: number;
}

interface IPerformanceImpact {
    accuracyDelta: number;
    confidenceDelta: number;
}

interface IAdjustmentChanges {
    weights?: Map<string, number>;
    thresholds?: Partial<IThresholds>;
    factorImportance?: Map<string, number>;
}

interface IAdjustmentHistory {
    timestamp: Date;
    changes: IAdjustmentChanges;
    reason: string;
    performanceImpact: IPerformanceImpact;
}

interface IMetadata {
    lastUpdated: Date;
    version: number;
    totalUpdates: number;
}

export interface IAILearningParams extends Document {
    predictionType: PredictionType;
    weights: Map<string, number>;
    thresholds: IThresholds;
    factorImportance: Map<string, number>;
    adjustmentHistory: IAdjustmentHistory[];
    metadata: IMetadata;
    createdAt: Date;
    updatedAt: Date;
    applyAdjustments(adjustments: IAdjustmentChanges, reason: string): Promise<IAILearningParams>;
}

interface IAILearningParamsModel extends Model<IAILearningParams> {
    getCurrentParams(predictionType: PredictionType): Promise<IAILearningParams | null>;
    getParamHistory(predictionType: PredictionType, timeRange?: number): Promise<Array<{
        _id: PredictionType;
        adjustments: IAdjustmentHistory[];
        totalAdjustments: number;
        averageAccuracyDelta: number;
        averageConfidenceDelta: number;
    }>>;
}

const aiLearningParamsSchema = new Schema<IAILearningParams>({
    predictionType: {
        type: String,
        required: true,
        enum: ['visit_duration', 'task_assignment', 'bottleneck', 'scheduling']
    },
    weights: {
        type: Map,
        of: Number,
        required: true,
        validate: [
            (v: Map<string, number>) => v.size > 0,
            'Weights map cannot be empty'
        ]
    },
    thresholds: {
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        },
        accuracy: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        errorTolerance: {
            type: Number,
            required: true,
            min: 0
        }
    },
    factorImportance: {
        type: Map,
        of: Number,
        required: true,
        validate: [
            (v: Map<string, number>) => v.size > 0,
            'Factor importance map cannot be empty'
        ]
    },
    adjustmentHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        changes: {
            weights: {
                type: Map,
                of: Number
            },
            thresholds: {
                confidence: Number,
                accuracy: Number,
                errorTolerance: Number
            },
            factorImportance: {
                type: Map,
                of: Number
            }
        },
        reason: String,
        performanceImpact: {
            accuracyDelta: Number,
            confidenceDelta: Number
        }
    }],
    metadata: {
        lastUpdated: {
            type: Date,
            default: Date.now
        },
        version: {
            type: Number,
            default: 1
        },
        totalUpdates: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
aiLearningParamsSchema.index({ predictionType: 1 });
aiLearningParamsSchema.index({ 'metadata.lastUpdated': -1 });

// Methods for parameter management
aiLearningParamsSchema.statics.getCurrentParams = async function(
    predictionType: PredictionType
): Promise<IAILearningParams | null> {
    return this.findOne({ predictionType }).sort({ 'metadata.version': -1 });
};

aiLearningParamsSchema.statics.getParamHistory = async function(
    predictionType: PredictionType,
    timeRange: number = 30
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    return this.aggregate([
        {
            $match: {
                predictionType,
                'adjustmentHistory.timestamp': { $gte: startDate }
            }
        },
        {
            $unwind: '$adjustmentHistory'
        },
        {
            $match: {
                'adjustmentHistory.timestamp': { $gte: startDate }
            }
        },
        {
            $sort: {
                'adjustmentHistory.timestamp': 1
            }
        },
        {
            $group: {
                _id: '$predictionType',
                adjustments: {
                    $push: '$adjustmentHistory'
                },
                totalAdjustments: { $sum: 1 },
                averageAccuracyDelta: { $avg: '$adjustmentHistory.performanceImpact.accuracyDelta' },
                averageConfidenceDelta: { $avg: '$adjustmentHistory.performanceImpact.confidenceDelta' }
            }
        }
    ]);
};

aiLearningParamsSchema.methods.applyAdjustments = async function(
    this: IAILearningParams,
    adjustments: IAdjustmentChanges,
    reason: string
): Promise<IAILearningParams> {
    // Apply weight adjustments
    if (adjustments.weights) {
        for (const [key, delta] of adjustments.weights.entries()) {
            const currentWeight = this.weights.get(key) || 0;
            this.weights.set(key, currentWeight + delta);
        }
    }

    // Apply threshold adjustments
    if (adjustments.thresholds) {
        for (const [key, delta] of Object.entries(adjustments.thresholds)) {
            if (delta !== undefined) {
                const currentValue = this.thresholds[key as keyof IThresholds];
                const maxValue = key === 'confidence' ? 1 : 100;
                this.thresholds[key as keyof IThresholds] = Math.max(0, Math.min(
                    maxValue,
                    currentValue + delta
                ));
            }
        }
    }

    // Apply factor importance adjustments
    if (adjustments.factorImportance) {
        for (const [key, delta] of adjustments.factorImportance.entries()) {
            const currentImportance = this.factorImportance.get(key) || 0;
            this.factorImportance.set(key, currentImportance + delta);
        }
    }

    // Record adjustment in history
    this.adjustmentHistory.push({
        timestamp: new Date(),
        changes: adjustments,
        reason,
        performanceImpact: {
            accuracyDelta: 0, // To be updated after measuring impact
            confidenceDelta: 0
        }
    });

    // Update metadata
    this.metadata.lastUpdated = new Date();
    this.metadata.totalUpdates += 1;
    this.metadata.version += 1;

    return this.save();
};

// Add validation for weights and factor importance
aiLearningParamsSchema.pre('save', function(this: IAILearningParams, next) {
    // Validate weights
    if (this.weights.size === 0) {
        next(new Error('Weights map cannot be empty'));
        return;
    }

    // Validate factor importance
    if (this.factorImportance.size === 0) {
        next(new Error('Factor importance map cannot be empty'));
        return;
    }

    next();
});

export const AILearningParams: IAILearningParamsModel = mongoose.model<IAILearningParams, IAILearningParamsModel>('AILearningParams', aiLearningParamsSchema);

export default AILearningParams; 