import { z } from 'zod';

// User-related schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = loginSchema.extend({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['admin', 'doctor', 'nurse', 'patient']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// Patient-related schemas
export const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other']),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  emergencyContact: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    relationship: z.string(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
    email: z.string().email('Invalid email address').optional(),
    address: z.string().optional(),
  }),
});

// Diagnosis-related schemas
export const diagnosisSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  diagnosis: z.string().min(10, 'Diagnosis must be at least 10 characters'),
  severity: z.enum(['low', 'medium', 'high']),
  treatment: z.object({
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.number(),
      notes: z.string().optional(),
    })),
    instructions: z.string(),
    followUpDate: z.date().optional(),
    restrictions: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
});

// Appointment-related schemas
export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  dateTime: z.date(),
  duration: z.number().min(15, 'Appointment must be at least 15 minutes'),
  type: z.enum(['regular', 'follow-up', 'emergency']),
  notes: z.string().optional(),
});

// Helper function to validate form data
export const validateForm = async <T>(
  schema: z.Schema<T>,
  data: unknown
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const validData = await schema.parseAsync(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }
    return {
      success: false,
      error: 'Validation failed',
    };
  }
};

// Custom validation rules
export const customRules = {
  isValidHealthcareEmail: (email: string) => {
    const healthcareEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(hospital|clinic|med|healthcare)\.[a-zA-Z]{2,}$/;
    return healthcareEmailPattern.test(email);
  },
  
  isValidMedicalLicense: (license: string) => {
    const licensePattern = /^[A-Z]{2}\d{6}$/;
    return licensePattern.test(license);
  },
  
  isValidBloodPressure: (systolic: number, diastolic: number) => {
    return systolic > diastolic && 
           systolic >= 70 && systolic <= 200 &&
           diastolic >= 40 && diastolic <= 130;
  },
  
  isValidTemperature: (celsius: number) => {
    return celsius >= 35 && celsius <= 42;
  },
  
  isValidOxygenSaturation: (percentage: number) => {
    return percentage >= 70 && percentage <= 100;
  },
}; 