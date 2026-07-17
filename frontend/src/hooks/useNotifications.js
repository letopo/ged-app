// frontend/src/hooks/useNotifications.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializeSocket, onNewTask, onTaskUpdate, onRightsChanged, offSocketEvent, disconnectSocket, getSocket } from '../services/api';
import { 
  isPushSupported, 
  subscribeToPush, 
  checkPushSubscription 
} from '../utils/pushNotificationHelper';

const useNotifications = () => {
  const { isAuthenticated, user, updateUser } = useAuth();
  const audioRef = useRef(null);
  const hasRequestedPermission = useRef(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // ❌ SUPPRIMER CETTE LIGNE
  // const isValidator = user?.role === 'validator' || user?.role === 'admin';

  useEffect(() => {
    audioRef.current = new Audio('/notification.wav');
    audioRef.current.volume = 0.5;
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('⚠️ Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied' && !hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // ✅ MODIFIER : Supprimer la vérification isValidator
  const initializePushNotifications = useCallback(async () => {
    // ❌ SUPPRIMER CETTE CONDITION
    // if (!isValidator) {
    //   console.log('ℹ️  Push notifications réservées aux validateurs');
    //   return;
    // }

    if (!isPushSupported()) {
      console.log('🔭 Web Push non supporté sur ce navigateur');
      return;
    }

    try {
      const isSubscribed = await checkPushSubscription();
      
      if (isSubscribed) {
        console.log('✅ Déjà souscrit aux notifications push');
        setPushSubscribed(true);
        return;
      }

      const hasPermission = await requestNotificationPermission();
      
      if (!hasPermission) {
        console.log('🔕 Permission de notification refusée');
        return;
      }

      console.log('📬 Souscription aux notifications push...');
      await subscribeToPush();
      setPushSubscribed(true);
      console.log('✅ Souscription push réussie !');

    } catch (error) {
      console.error('❌ Erreur initialisation push:', error);
    }
  }, [requestNotificationPermission]); // ❌ Supprimer isValidator ici aussi

  const showNotification = useCallback((data) => {
    // Toujours jouer le son, meme sans permission de notification
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        console.warn('⚠️ Impossible de jouer le son:', e.message);
      });
    }

    // Afficher la notification navigateur si permission accordee
    // ('Notification' n'existe pas du tout sur Safari iOS hors mode standalone)
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'Nouvelle tache de validation';
      const options = {
        body: `${data.documentTitle}\nSoumis par: ${data.submittedBy}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `task-${data.taskId}`,
        requireInteraction: true,
        data: {
          taskId: data.taskId,
          documentId: data.documentId,
          url: '/mes-taches'
        }
      };

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        if (window.location.pathname === '/mes-taches') {
          window.location.reload();
        } else {
          window.location.href = '/mes-taches';
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    }

    console.log('🔔 Notification recue:', data.documentTitle);
  }, []);

  const handleNewTask = useCallback((data) => {
    console.log('🔔 Nouvelle tâche reçue via Socket.IO:', data);
    showNotification(data);
    window.dispatchEvent(new CustomEvent('newTask', { detail: data }));
  }, [showNotification]);

  const handleTaskUpdate = useCallback((data) => {
    console.log('🔄 Mise à jour de tâche:', data);
    window.dispatchEvent(new CustomEvent('taskUpdate', { detail: data }));
  }, []);

  const handleRightsChanged = useCallback(async (data) => {
    console.log('🔐 Droits modifiés:', data);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        const freshUser = body.user || body;
        localStorage.setItem('user', JSON.stringify(freshUser));
        updateUser(freshUser);
        // Bannière visible
        window.dispatchEvent(new CustomEvent('rightsChanged', { detail: data }));
      }
    } catch (e) {
      console.error('Erreur rechargement profil:', e);
    }
  }, [updateUser]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('❌ Utilisateur non authentifié');
      return;
    }

    console.log('✅ Utilisateur authentifié - Initialisation notifications');

    const socket = initializeSocket();

    if (!socket) {
      console.error('❌ Impossible d\'initialiser Socket.IO');
    } else {
      onNewTask(handleNewTask);
      onTaskUpdate(handleTaskUpdate);
      onRightsChanged(handleRightsChanged);

      // Notification @mention dans le chat
      const handleMention = (data) => {
        window.dispatchEvent(new CustomEvent('chatMention', { detail: data }));
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(`💬 ${data.fromName} vous a mentionné`, {
            body: data.excerpt,
            icon: '/favicon.ico',
            tag: `mention-${data.conversationId}`,
          });
          n.onclick = () => { window.focus(); window.location.href = `/chat/${data.conversationId}`; n.close(); };
          setTimeout(() => n.close(), 8000);
        }
      };
      socket.on('chat:mention', handleMention);
    }

    // ✅ Tout le monde peut initialiser Push
    initializePushNotifications();

    return () => {
      console.log('🧹 Nettoyage des listeners');
      if (socket) {
        offSocketEvent('task_assigned', handleNewTask);
        offSocketEvent('task_updated', handleTaskUpdate);
        offSocketEvent('rights_changed', handleRightsChanged);
        disconnectSocket();
      }
    };
  }, [isAuthenticated, user, handleNewTask, handleTaskUpdate, initializePushNotifications]);

  return {
    requestNotificationPermission,
    notificationsSupported: 'Notification' in window,
    notificationsEnabled: 'Notification' in window && Notification.permission === 'granted',
    pushSupported: isPushSupported(),
    pushSubscribed
    // ❌ SUPPRIMER isValidator de l'export
  };
};

export default useNotifications;