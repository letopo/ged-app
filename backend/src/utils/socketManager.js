// backend/src/utils/socketManager.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;
const userSockets = new Map(); // Map<userId, Set<socketId>>

/**
 * Initialise Socket.IO avec le serveur HTTP
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost',
        'http://localhost:80',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://192.168.1.186',
        process.env.CORS_ORIGIN
      ].filter(Boolean),
      credentials: true
    }
  });

  // Middleware d'authentification Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Vérifier le token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      
      console.log(`✅ Socket authentifié: User ${decoded.id} (${decoded.email})`);
      next();
    } catch (error) {
      console.error('❌ Erreur authentification socket:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    // Ajouter le socket à la map des utilisateurs
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
    console.log(`🔌 User ${userId} connecté (Socket: ${socket.id})`);
    console.log(`📊 Total connexions actives: ${io.engine.clientsCount}`);

    // Rejoindre une room personnelle basée sur l'userId
    socket.join(`user:${userId}`);

    // Gérer la déconnexion
    socket.on('disconnect', () => {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`🔌 User ${userId} déconnecté (Socket: ${socket.id})`);
      console.log(`📊 Total connexions actives: ${io.engine.clientsCount}`);
    });

    // Événement de test (optionnel)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  console.log('✅ Socket.IO initialisé avec succès');
  return io;
};

/**
 * Émet une notification de nouvelle tâche à un validateur spécifique
 */
export const emitNewTaskNotification = (validatorId, taskData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO non initialisé');
    return false;
  }

  const notification = {
    type: 'new_task',
    taskId: taskData.taskId,
    documentId: taskData.documentId,
    documentTitle: taskData.documentTitle,
    documentCategory: taskData.documentCategory,
    submittedBy: taskData.submittedBy,
    timestamp: new Date().toISOString(),
    message: `Nouvelle tâche: ${taskData.documentTitle}`
  };

  // Émettre vers la room de l'utilisateur
  io.to(`user:${validatorId}`).emit('task_assigned', notification);
  
  console.log(`🔔 Notification envoyée à User ${validatorId}:`, notification);
  
  return true;
};

/**
 * Émet une notification de mise à jour de tâche
 */
export const emitTaskUpdateNotification = (validatorId, updateData) => {
  if (!io) {
    console.warn('⚠️ Socket.IO non initialisé');
    return false;
  }

  const notification = {
    type: 'task_update',
    taskId: updateData.taskId,
    status: updateData.status,
    timestamp: new Date().toISOString(),
    message: updateData.message
  };

  io.to(`user:${validatorId}`).emit('task_updated', notification);
  
  console.log(`🔔 Mise à jour envoyée à User ${validatorId}:`, notification);
  
  return true;
};

/**
 * Vérifie si un utilisateur est connecté
 */
export const isUserConnected = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

/**
 * Obtient le nombre de connexions actives pour un utilisateur
 */
export const getUserConnectionCount = (userId) => {
  const userSocketSet = userSockets.get(userId);
  return userSocketSet ? userSocketSet.size : 0;
};

/**
 * Obtient les statistiques globales
 */
export const getSocketStats = () => {
  return {
    totalConnections: io ? io.engine.clientsCount : 0,
    uniqueUsers: userSockets.size,
    userSockets: Array.from(userSockets.entries()).map(([userId, sockets]) => ({
      userId,
      connectionCount: sockets.size
    }))
  };
};

export const getIO = () => io;

export default {
  initializeSocket,
  emitNewTaskNotification,
  emitTaskUpdateNotification,
  isUserConnected,
  getUserConnectionCount,
  getSocketStats,
  getIO
};