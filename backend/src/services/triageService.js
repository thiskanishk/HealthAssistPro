const TriageAssessment = require('../models/TriageAssessment');
const Patient = require('../models/Patient');

class TriageService {
  constructor() {
    // Initialize symptom severity weights
    this.symptomWeights = {
      'chest_pain': 10,
      'difficulty_breathing': 9,
      'severe_bleeding': 9,
      'unconsciousness': 10,
      'severe_pain': 8,
      'high_fever': 7,
      'trauma': 8,
      'allergic_reaction': 8
    };

    // Define vital sign thresholds
    this.vitalThresholds = {
      temperature: {
        critical: { low: 35, high: 40 },
        warning: { low: 36, high: 38.5 }
      },
      heartRate: {
        critical: { low: 40, high: 150 },
        warning: { low: 60, high: 100 }
      },
      bloodPressure: {
        systolic: {
          critical: { low: 80, high: 180 },
          warning: { low: 90, high: 140 }
        },
        diastolic: {
          critical: { low: 50, high: 120 },
          warning: { low: 60, high: 90 }
        }
      },
      respiratoryRate: {
        critical: { low: 8, high: 30 },
        warning: { low: 12, high: 20 }
      },
      oxygenSaturation: {
        critical: { low: 90, high: 100 },
        warning: { low: 95, high: 100 }
      }
    };
  }

  async assessPatient(patientData) {
    try {
      const { symptoms, vitalSigns, patientId } = patientData;
      
      // Get patient's medical history
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Calculate initial triage score
      const triageScore = this._calculateInitialScore(symptoms, vitalSigns);
      
      // Adjust score based on medical history and risk factors
      const adjustedScore = this._adjustScoreForRiskFactors(
        triageScore,
        patient.medicalHistory,
        patient.riskFactors
      );

      // Determine triage level and estimated wait time
      const assessment = this._determineTriageLevel(adjustedScore);
      
      // Create triage assessment record
      const triageAssessment = new TriageAssessment({
        patientId,
        symptoms,
        vitalSigns,
        medicalHistory: {
          relevantConditions: patient.medicalHistory.conditions,
          allergies: patient.medicalHistory.allergies,
          medications: patient.medicalHistory.medications
        },
        aiAssessment: {
          ...assessment,
          confidenceScore: this._calculateConfidenceScore(symptoms, vitalSigns),
          potentialDiagnoses: await this._generatePotentialDiagnoses(symptoms, patient.medicalHistory)
        },
        status: 'pending'
      });

      await triageAssessment.save();
      return triageAssessment;
    } catch (error) {
      console.error('Triage assessment error:', error);
      throw error;
    }
  }

  _calculateInitialScore(symptoms, vitalSigns) {
    let score = 0;

    // Calculate symptom score
    symptoms.forEach(symptom => {
      const baseWeight = this.symptomWeights[symptom.name] || 5;
      score += (baseWeight * symptom.severity) / 10;
    });

    // Calculate vital signs score
    score += this._evaluateVitalSigns(vitalSigns);

    return score;
  }

  _evaluateVitalSigns(vitalSigns) {
    let score = 0;

    // Check each vital sign against thresholds
    if (vitalSigns.temperature) {
      score += this._checkVitalThreshold('temperature', vitalSigns.temperature);
    }

    if (vitalSigns.heartRate) {
      score += this._checkVitalThreshold('heartRate', vitalSigns.heartRate);
    }

    if (vitalSigns.bloodPressure) {
      score += this._checkVitalThreshold('bloodPressure', vitalSigns.bloodPressure, 'systolic');
      score += this._checkVitalThreshold('bloodPressure', vitalSigns.bloodPressure, 'diastolic');
    }

    if (vitalSigns.respiratoryRate) {
      score += this._checkVitalThreshold('respiratoryRate', vitalSigns.respiratoryRate);
    }

    if (vitalSigns.oxygenSaturation) {
      score += this._checkVitalThreshold('oxygenSaturation', vitalSigns.oxygenSaturation);
    }

    return score;
  }

  _checkVitalThreshold(vitalType, value, subType = null) {
    const thresholds = subType ? 
      this.vitalThresholds[vitalType][subType] : 
      this.vitalThresholds[vitalType];

    if (value <= thresholds.critical.low || value >= thresholds.critical.high) {
      return 10;
    } else if (value <= thresholds.warning.low || value >= thresholds.warning.high) {
      return 5;
    }
    return 0;
  }

  _adjustScoreForRiskFactors(score, medicalHistory, riskFactors) {
    let adjustedScore = score;

    // Adjust for chronic conditions
    if (medicalHistory.conditions.length > 0) {
      adjustedScore *= 1.2;
    }

    // Adjust for risk factors
    riskFactors.forEach(risk => {
      if (risk.impact === 'high') adjustedScore *= 1.3;
      else if (risk.impact === 'medium') adjustedScore *= 1.2;
      else if (risk.impact === 'low') adjustedScore *= 1.1;
    });

    return adjustedScore;
  }

  _determineTriageLevel(score) {
    let triageLevel, estimatedWaitTime, recommendedAction;

    if (score >= 35) {
      triageLevel = 'immediate';
      estimatedWaitTime = 0;
      recommendedAction = 'Immediate medical attention required';
    } else if (score >= 25) {
      triageLevel = 'emergency';
      estimatedWaitTime = 10;
      recommendedAction = 'Emergency care needed within 10 minutes';
    } else if (score >= 15) {
      triageLevel = 'urgent';
      estimatedWaitTime = 30;
      recommendedAction = 'Urgent care needed within 30 minutes';
    } else if (score >= 10) {
      triageLevel = 'semi-urgent';
      estimatedWaitTime = 60;
      recommendedAction = 'Semi-urgent care needed within 1 hour';
    } else {
      triageLevel = 'non-urgent';
      estimatedWaitTime = 120;
      recommendedAction = 'Non-urgent care needed within 2 hours';
    }

    return { triageLevel, estimatedWaitTime, recommendedAction };
  }

  _calculateConfidenceScore(symptoms, vitalSigns) {
    // Calculate confidence based on data completeness and consistency
    let confidenceScore = 1.0;
    
    // Reduce confidence if vital signs are missing
    const expectedVitals = ['temperature', 'heartRate', 'bloodPressure', 'respiratoryRate', 'oxygenSaturation'];
    const missingVitals = expectedVitals.filter(vital => !vitalSigns[vital]);
    confidenceScore -= (missingVitals.length * 0.1);

    // Reduce confidence if symptoms are vague or minimal
    if (symptoms.length === 0) {
      confidenceScore -= 0.3;
    } else if (symptoms.length === 1) {
      confidenceScore -= 0.1;
    }

    // Ensure confidence score stays between 0 and 1
    return Math.max(0, Math.min(1, confidenceScore));
  }

  async _generatePotentialDiagnoses(symptoms, medicalHistory) {
    // This would typically integrate with a medical knowledge base or ML model
    // For now, we'll return a simplified example
    const diagnoses = [];
    
    // Map common symptom combinations to potential conditions
    const symptomNames = symptoms.map(s => s.name);
    
    if (symptomNames.includes('chest_pain')) {
      diagnoses.push(
        { condition: 'Acute Coronary Syndrome', probability: 0.7 },
        { condition: 'Anxiety', probability: 0.2 },
        { condition: 'Gastroesophageal Reflux', probability: 0.1 }
      );
    }
    
    // Add more symptom-to-diagnosis mappings as needed
    
    return diagnoses;
  }

  async getWaitingList() {
    return TriageAssessment.find({
      status: { $ne: 'completed' }
    })
    .sort({ 'aiAssessment.triageLevel': 1, timestamp: 1 })
    .populate('patientId');
  }

  async updateNurseReview(assessmentId, nurseData) {
    const { reviewedBy, adjustedTriageLevel, notes } = nurseData;
    
    return TriageAssessment.findByIdAndUpdate(
      assessmentId,
      {
        $set: {
          'nurseReview.reviewed': true,
          'nurseReview.reviewedBy': reviewedBy,
          'nurseReview.reviewedAt': new Date(),
          'nurseReview.adjustedTriageLevel': adjustedTriageLevel,
          'nurseReview.notes': notes,
          status: 'in_review'
        }
      },
      { new: true }
    );
  }
}

module.exports = new TriageService(); 