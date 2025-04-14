const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of userId -> WebSocket
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract token from query string
        const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
        if (!token) {
          throw new AppError('Authentication token is required', 401);
        }

        // Verify token and get user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Store the connection
        this.clients.set(userId, ws);

        // Setup heartbeat
        ws.isAlive = true;
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle incoming messages
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data);
            await this.handleMessage(userId, message);
          } catch (error) {
            this.sendError(ws, error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(userId);
        });

        // Send initial connection success
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'success',
          userId
        }));

      } catch (error) {
        this.sendError(ws, error);
        ws.terminate();
      }
    });

    // Setup heartbeat interval
    this.heartbeat = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    // Cleanup on server close
    this.wss.on('close', () => {
      clearInterval(this.heartbeat);
    });
  }

  async handleMessage(userId, message) {
    const { type, data } = message;

    switch (type) {
      case 'notification_read':
        await this.handleNotificationRead(userId, data);
        break;
      case 'status_update':
        await this.handleStatusUpdate(userId, data);
        break;
      case 'join_room':
        await this.handleJoinRoom(userId, data);
        break;
      default:
        throw new AppError('Invalid message type', 400);
    }
  }

  async handleNotificationRead(userId, data) {
    // Update notification status in database
    // Broadcast to relevant clients
    this.broadcastToUser(userId, {
      type: 'notification_updated',
      data: { id: data.notificationId, read: true }
    });
  }

  async handleStatusUpdate(userId, data) {
    // Update user status
    // Broadcast to relevant clients
    this.broadcastToRoom(data.roomId, {
      type: 'user_status_changed',
      data: { userId, status: data.status }
    });
  }

  async handleJoinRoom(userId, data) {
    // Add user to room
    // Notify other room participants
    this.broadcastToRoom(data.roomId, {
      type: 'user_joined',
      data: { userId, roomId: data.roomId }
    });
  }

  // Send message to specific user
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast to all users in a room
  broadcastToRoom(roomId, message) {
    // Get all users in room and send message
    this.getRoomUsers(roomId).forEach(userId => {
      this.sendToUser(userId, message);
    });
  }

  // Broadcast to all connected clients
  broadcast(message) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Send error message to client
  sendError(ws, error) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Internal server error',
        status: error.statusCode || 500
      }));
    }
  }

  // Get all users in a room (implement based on your room management logic)
  getRoomUsers(roomId) {
    // Return array of userIds in the room
    return [];
  }
}

module.exports = WebSocketService; 