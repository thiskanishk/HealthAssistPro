import mongoose, { Document, Schema, Model } from 'mongoose';
import { Types } from 'mongoose';

export type TreatmentEffectiveness = 'very_effective' | 'somewhat_effective' | 'not_effective' | 'not_implemented' | 'unknown';

interface IAccuracy {
    wasCorrect: boolean;
    actualCondition: string;
    actualICD10: string;
}

interface IMetadata {
    browserInfo: string;
    responseTime: number;
    diagnosisVersion: string;
}

export interface IFeedback extends Document {
    diagnosis: Types.ObjectId;
    user: Types.ObjectId;
    rating: number;
    comment?: string;
    accuracy: IAccuracy;
    usefulnessScore?: number;
    treatmentEffectiveness: TreatmentEffectiveness;
    suggestedImprovements: string[];
    metadata: IMetadata;
    createdAt: Date;
    updatedAt: Date;
}

interface IFeedbackStatistics {
    averageRating: number;
    totalFeedback: number;
    ratingDistribution: number[];
    accuracyRate: number;
    averageResponseTime: number;
}

interface IFeedbackModel extends Model<IFeedback> {
    getStatistics(startDate: Date, endDate: Date): Promise<IFeedbackStatistics>;
}

const feedbackSchema = new Schema<IFeedback>({
    diagnosis: {
        type: Schema.Types.ObjectId,
        ref: 'Diagnosis',
        required: true,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxLength: 1000
    },
    accuracy: {
        wasCorrect: Boolean,
        actualCondition: String,
        actualICD10: String
    },
    usefulnessScore: {
        type: Number,
        min: 1,
        max: 5
    },
    treatmentEffectiveness: {
        type: String,
        enum: ['very_effective', 'somewhat_effective', 'not_effective', 'not_implemented', 'unknown']
    },
    suggestedImprovements: [String],
    metadata: {
        browserInfo: String,
        responseTime: Number,
        diagnosisVersion: String
    }
}, {
    timestamps: true
});

// Indexes for aggregation queries
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: 1, createdAt: -1 });

// Static method to get feedback statistics
feedbackSchema.statics.getStatistics = async function(
    startDate: Date,
    endDate: Date
): Promise<IFeedbackStatistics> {
    const match = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
    };

    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalFeedback: { $sum: 1 },
                ratingDistribution: {
                    $push: '$rating'
                },
                accuracyRate: {
                    $avg: { $cond: ['$accuracy.wasCorrect', 1, 0] }
                },
                averageResponseTime: { $avg: '$metadata.responseTime' }
            }
        },
        {
            $project: {
                _id: 0,
                averageRating: { $round: ['$averageRating', 2] },
                totalFeedback: 1,
                ratingDistribution: 1,
                accuracyRate: { $round: ['$accuracyRate', 2] },
                averageResponseTime: { $round: ['$averageResponseTime', 2] }
            }
        }
    ]);

    return stats[0] || {
        averageRating: 0,
        totalFeedback: 0,
        ratingDistribution: [],
        accuracyRate: 0,
        averageResponseTime: 0
    };
};

export const Feedback: IFeedbackModel = mongoose.model<IFeedback, IFeedbackModel>('Feedback', feedbackSchema);

export default Feedback; 