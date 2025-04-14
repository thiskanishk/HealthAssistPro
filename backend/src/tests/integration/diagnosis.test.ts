import request from 'supertest';
import app from '../../server';
import { User } from '../../models/User';
import { generateToken } from '../../utils/auth';

describe('Diagnosis API', () => {
    let doctorToken: string;
    let patientId: string;

    beforeEach(async () => {
        // Create test doctor
        const doctor = await User.create({
            email: 'doctor@test.com',
            password: 'password123',
            role: 'doctor',
            firstName: 'Test',
            lastName: 'Doctor',
            specialization: 'General'
        });

        doctorToken = generateToken(doctor);

        // Create test patient
        const patient = await User.create({
            email: 'patient@test.com',
            password: 'password123',
            role: 'patient',
            firstName: 'Test',
            lastName: 'Patient'
        });

        patientId = patient.id;
    });

    describe('POST /api/diagnosis', () => {
        it('should create a new diagnosis', async () => {
            const diagnosisData = {
                patientId,
                symptoms: ['fever', 'cough'],
                diagnosis: 'Common Cold',
                notes: 'Rest and hydration recommended'
            };

            const response = await request(app)
                .post('/api/diagnosis')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(diagnosisData);

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveProperty('diagnosis', 'Common Cold');
        });
    });
}); 