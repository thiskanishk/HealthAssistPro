import mongoose, { Document, Schema, Model } from 'mongoose';

export type PredictionType = 'visit_duration' | 'task_assignment' | 'bottleneck' | 'scheduling';

interface IUserFeedback {
    rating: number;
    comments?: string;
    tags?: string[];
}

interface IContext {
    userId: Schema.Types.ObjectId;
    departmentId: Schema.Types.ObjectId;
    metadata: Record<string, any>;
}

interface IAnalysisResults {
    patterns: string[];
    insights: string[];
    suggestedAdjustments: string[];
}

export interface IAIFeedback extends Document {
    predictionType: PredictionType;
    actualOutcome: any;
    predictedOutcome: any;
    accuracy: number;
    userFeedback: IUserFeedback;
    context: IContext;
    timestamp: Date;
    isProcessed: boolean;
    analysisResults: IAnalysisResults;
    createdAt: Date;
    updatedAt: Date;
}

interface IAIFeedbackModel extends Model<IAIFeedback> {
    getAccuracyTrend(predictionType: PredictionType, timeRange?: number): Promise<Array<{
        _id: string;
        averageAccuracy: number;
        count: number;
    }>>;
    getCommonPatterns(predictionType: PredictionType, timeRange?: number): Promise<Array<{
        _id: string;
        count: number;
    }>>;
    getUserFeedbackSummary(predictionType: PredictionType, timeRange?: number): Promise<{
        averageRating: number;
        totalFeedback: number;
        commonTags: string[];
    }>;
    getDepartmentPerformance(departmentId: string, timeRange?: number): Promise<Array<{
        _id: PredictionType;
        averageAccuracy: number;
        totalPredictions: number;
        averageRating: number;
    }>>;
}

const aiFeedbackSchema = new Schema<IAIFeedback>({
    predictionType: {
        type: String,
        required: true,
        enum: ['visit_duration', 'task_assignment', 'bottleneck', 'scheduling']
    },
    actualOutcome: Schema.Types.Mixed,
    predictedOutcome: Schema.Types.Mixed,
    accuracy: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    userFeedback: {
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comments: String,
        tags: [String]
    },
    context: {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        departmentId: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        metadata: Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isProcessed: {
        type: Boolean,
        default: false
    },
    analysisResults: {
        patterns: [String],
        insights: [String],
        suggestedAdjustments: [String]
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
aiFeedbackSchema.index({ predictionType: 1, timestamp: -1 });
aiFeedbackSchema.index({ 'context.userId': 1 });
aiFeedbackSchema.index({ 'context.departmentId': 1 });
aiFeedbackSchema.index({ accuracy: 1 });

// Methods for feedback analysis
aiFeedbackSchema.statics.getAccuracyTrend = async function(
    predictionType: PredictionType,
    timeRange: number = 30
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    return this.aggregate([
        {
            $match: {
                predictionType,
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$timestamp'
                    }
                },
                averageAccuracy: { $avg: '$accuracy' },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};

aiFeedbackSchema.statics.getCommonPatterns = async function(
    predictionType: PredictionType,
    timeRange: number = 30
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    return this.aggregate([
        {
            $match: {
                predictionType,
                timestamp: { $gte: startDate },
                'analysisResults.patterns': { $exists: true }
            }
        },
        {
            $unwind: '$analysisResults.patterns'
        },
        {
            $group: {
                _id: '$analysisResults.patterns',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        },
        {
            $limit: 10
        }
    ]);
};

aiFeedbackSchema.statics.getUserFeedbackSummary = async function(
    predictionType: PredictionType,
    timeRange: number = 30
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    return this.aggregate([
        {
            $match: {
                predictionType,
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$userFeedback.rating' },
                totalFeedback: { $sum: 1 },
                commonTags: {
                    $push: '$userFeedback.tags'
                }
            }
        },
        {
            $project: {
                _id: 0,
                averageRating: 1,
                totalFeedback: 1,
                commonTags: {
                    $reduce: {
                        input: '$commonTags',
                        initialValue: [],
                        in: { $setUnion: ['$$value', '$$this'] }
                    }
                }
            }
        }
    ]);
};

aiFeedbackSchema.statics.getDepartmentPerformance = async function(
    departmentId: string,
    timeRange: number = 30
) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    return this.aggregate([
        {
            $match: {
                'context.departmentId': new mongoose.Types.ObjectId(departmentId),
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$predictionType',
                averageAccuracy: { $avg: '$accuracy' },
                totalPredictions: { $sum: 1 },
                averageRating: { $avg: '$userFeedback.rating' }
            }
        }
    ]);
};

// Add validation for metadata
aiFeedbackSchema.path('context.metadata').validate(function(value: any) {
    return value && typeof value === 'object' && !Array.isArray(value);
}, 'Metadata must be an object');

export const AIFeedback: IAIFeedbackModel = mongoose.model<IAIFeedback, IAIFeedbackModel>('AIFeedback', aiFeedbackSchema);

export default AIFeedback; 