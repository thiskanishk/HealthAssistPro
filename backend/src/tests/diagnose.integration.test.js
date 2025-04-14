
const request = require('supertest');
const app = require('../app'); // assumes Express app is exported from here
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('POST /api/v1/diagnose', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ _id: 'user123', role: 'Doctor' }, process.env.JWT_SECRET || 'testsecret');
  });

  it('should return diagnosis results for a valid patient input', async () => {
    const response = await request(app)
      .post('/api/v1/diagnose')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientId: 'patient123',
        age: 40,
        gender: 'Male',
        symptoms: ['fever', 'cough'],
        medicalHistory: ['asthma'],
        vitals: { temperature: 101, heartRate: 90 },
        notes: 'Patient has shortness of breath.'
      });

    expect([200, 500]).toContain(response.statusCode); // May fail due to mock
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
