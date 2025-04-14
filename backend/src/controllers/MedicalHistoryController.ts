import { Request, Response } from 'express';
import { MedicalHistory } from '../models/MedicalHistory';
import { Patient } from '../models/Patient';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export class MedicalHistoryController {
    async getPatientHistory(req: Request, res: Response) {
        try {
            const { patientId } = req.params;

            const history = await MedicalHistory.findOne({ patientId })
                .populate('events.doctorId', 'firstName lastName')
                .sort({ 'events.date': -1 });

            if (!history) {
                throw new AppError('Medical history not found', 404);
            }

            return res.status(200).json({
                status: 'success',
                data: history
            });
        } catch (error) {
            logger.error('Error fetching patient history:', error);
            throw error;
        }
    }

    async getPatientTimeline(req: Request, res: Response) {
        try {
            const { patientId } = req.params;
            const { startDate, endDate } = req.query;

            const query: any = { patientId };

            if (startDate && endDate) {
                query['events.date'] = {
                    $gte: new Date(startDate as string),
                    $lte: new Date(endDate as string)
                };
            }

            const timeline = await MedicalHistory.aggregate([
                { $match: query },
                { $unwind: '$events' },
                { $sort: { 'events.date': -1 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'events.doctorId',
                        foreignField: '_id',
                        as: 'doctor'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        eventId: '$events._id',
                        type: '$events.type',
                        title: '$events.title',
                        description: '$events.description',
                        date: '$events.date',
                        status: '$events.status',
                        doctor: { $arrayElemAt: ['$doctor', 0] }
                    }
                }
            ]);

            return res.status(200).json({
                status: 'success',
                data: timeline
            });
        } catch (error) {
            logger.error('Error fetching patient timeline:', error);
            throw error;
        }
    }

    async addMedicalEvent(req: Request, res: Response) {
        try {
            const { patientId } = req.params;
            const { type, title, description, date, status } = req.body;
            const doctorId = req.user.id;

            const history = await MedicalHistory.findOneAndUpdate(
                { patientId },
                {
                    $push: {
                        events: {
                            type,
                            title,
                            description,
                            date: new Date(date),
                            status,
                            doctorId
                        }
                    }
                },
                { new: true, upsert: true }
            );

            // Update patient's last update timestamp
            await Patient.findByIdAndUpdate(patientId, {
                $set: { lastMedicalUpdate: new Date() }
            });

            return res.status(201).json({
                status: 'success',
                data: history
            });
        } catch (error) {
            logger.error('Error adding medical event:', error);
            throw error;
        }
    }
} 