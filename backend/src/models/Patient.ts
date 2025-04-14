import mongoose, { Document, Schema } from 'mongoose';

export interface IPatient extends Document {
    userId: Schema.Types.ObjectId;
    dateOfBirth: Date;
    gender: string;
    bloodType: string;
    allergies: string[];
    chronic 