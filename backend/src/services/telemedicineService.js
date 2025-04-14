const TelemedicineSession = require('../models/TelemedicineSession');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const config = require('../config');

class TelemedicineService {
  constructor() {
    this.activeConnections = new Map();
    this.waitingRoomQueue = new Map();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss = new WebSocket.Server({ port: config.telemedicine.wsPort });
    
    this.wss.on('connection', (ws, req) => {
      const sessionId = req.url.split('/')[1];
      if (!sessionId) {
        ws.close();
        return;
      }

      this.handleConnection(ws, sessionId);
    });
  }

  handleConnection(ws, sessionId) {
    if (!this.activeConnections.has(sessionId)) {
      this.activeConnections.set(sessionId, new Set());
    }
    this.activeConnections.get(sessionId).add(ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await this.handleWebSocketMessage(sessionId, ws, data);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(sessionId, ws);
    });
  }

  async handleWebSocketMessage(sessionId, ws, data) {
    switch (data.type) {
      case 'join_waiting_room':
        await this.addToWaitingRoom(sessionId, data.patientId);
        break;
      case 'start_session':
        await this.startSession(sessionId);
        break;
      case 'end_session':
        await this.endSession(sessionId);
        break;
      case 'update_vitals':
        await this.updateVitals(sessionId, data.vitals);
        break;
      case 'technical_issue':
        await this.recordTechnicalIssue(sessionId, data.issue);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  async createSession(patientId, doctorId, scheduledTime, type) {
    try {
      const sessionId = uuidv4();
      const meetingUrl = await this.generateMeetingUrl(sessionId);

      const session = new TelemedicineSession({
        sessionId,
        patientId,
        doctorId,
        scheduledStartTime: scheduledTime,
        type,
        meetingUrl,
        status: 'scheduled'
      });

      await session.save();
      return session;
    } catch (error) {
      console.error('Error creating telemedicine session:', error);
      throw new Error('Failed to create telemedicine session');
    }
  }

  async generateMeetingUrl(sessionId) {
    // Integration with video service provider (e.g., Twilio, Agora, etc.)
    return `${config.telemedicine.baseUrl}/meeting/${sessionId}`;
  }

  async addToWaitingRoom(sessionId, patientId) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    await session.joinWaitingRoom();
    this.waitingRoomQueue.set(sessionId, {
      patientId,
      joinTime: new Date(),
      priority: session.priority
    });

    this.broadcastWaitingRoomUpdate(session.doctorId);
  }

  async startSession(sessionId) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    await session.startSession();
    this.waitingRoomQueue.delete(sessionId);
    this.broadcastToSession(sessionId, {
      type: 'session_started',
      timestamp: new Date()
    });
  }

  async endSession(sessionId) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    await session.endSession();
    this.broadcastToSession(sessionId, {
      type: 'session_ended',
      timestamp: new Date()
    });

    // Clean up connections
    if (this.activeConnections.has(sessionId)) {
      const connections = this.activeConnections.get(sessionId);
      connections.forEach(ws => ws.close());
      this.activeConnections.delete(sessionId);
    }
  }

  async updateVitals(sessionId, vitalsData) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    await session.updateVitals(vitalsData);
    this.broadcastToSession(sessionId, {
      type: 'vitals_updated',
      vitals: vitalsData
    });
  }

  async recordTechnicalIssue(sessionId, issue) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    session.technicalDetails.connectionIssues.push({
      timestamp: new Date(),
      issue,
      duration: 0 // Will be updated when resolved
    });
    await session.save();
  }

  broadcastToSession(sessionId, message) {
    if (this.activeConnections.has(sessionId)) {
      const connections = this.activeConnections.get(sessionId);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  async broadcastWaitingRoomUpdate(doctorId) {
    const waitingPatients = await TelemedicineSession.getWaitingRoomPatients(doctorId);
    const message = {
      type: 'waiting_room_update',
      patients: waitingPatients
    };

    // Broadcast to doctor's interface
    this.activeConnections.forEach((connections, sessionId) => {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    });
  }

  handleDisconnection(sessionId, ws) {
    if (this.activeConnections.has(sessionId)) {
      const connections = this.activeConnections.get(sessionId);
      connections.delete(ws);
      if (connections.size === 0) {
        this.activeConnections.delete(sessionId);
      }
    }
  }

  async getSessionRecording(sessionId) {
    const session = await TelemedicineSession.findOne({ sessionId });
    if (!session || !session.recordingEnabled || !session.recordingUrl) {
      throw new Error('Recording not available');
    }
    return session.recordingUrl;
  }

  async getDoctorSchedule(doctorId, date) {
    return TelemedicineSession.getDoctorSchedule(doctorId, date);
  }

  async getWaitingRoomStatus(doctorId) {
    return TelemedicineSession.getWaitingRoomPatients(doctorId);
  }
}

module.exports = new TelemedicineService(); 