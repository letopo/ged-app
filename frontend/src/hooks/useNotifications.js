// frontend/src/hooks/useNotifications.js
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext'; // On a besoin de savoir si l'utilisateur est connecté
import { notificationsAPI } from '../services/api';

const notificationSound = '/notification.mp3';

const useNotifications = () => {
  const { isAuthenticated } = useAuth(); // Récupérer le statut de connexion
  const lastCheckTimestamp = useRef(Date.now());
  const audio = useRef(new Audio(notificationSound));

  useEffect(() => {
    // --- CORRECTION ---
    // On n'active la logique que si l'utilisateur est authentifié.
    if (!isAuthenticated) {
      return; // Ne rien faire si l'utilisateur n'est pas connecté
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      checkForNewTasks();
    }, 30000);

    // Nettoyer l'intervalle
    return () => clearInterval(interval);

  }, [isAuthenticated]); // L'effet se redéclenchera si le statut de connexion change

  const checkForNewTasks = async () => {
    if (document.hidden) {
      try {
        const response = await notificationsAPI.checkNewTasks(lastCheckTimestamp.current);
        if (response.data.newTasks) {
          showNotification(response.data.count);
        }
      } catch (error) {
        console.error("Erreur de vérification des notifications:", error);
      }
    }
    lastCheckTimestamp.current = Date.now();
  };

  const showNotification = (count) => {
    if (Notification.permission === 'granted') {
      const title = 'Nouvelle tâche de validation';
      const body = `Vous avez ${count} nouvelle(s) tâche(s) en attente.`;
      
      const notification = new Notification(title, { body: body, icon: '/favicon.ico' });
      audio.current.play().catch(e => console.error("Erreur lecture son:", e));
      notification.onclick = () => { window.open('/my-tasks', '_blank'); };
    }
  };
};

export default useNotifications;