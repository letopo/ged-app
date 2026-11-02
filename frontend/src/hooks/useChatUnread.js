// frontend/src/hooks/useChatUnread.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

const useChatUnread = () => {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await chatService.getUnreadCount();
      setUnreadCount(count);
    } catch (_) {}
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    refresh();

    // Rafraîchir toutes les 30 secondes
    intervalRef.current = setInterval(refresh, 30_000);

    // Écouter les nouveaux messages via socket pour màj immédiate
    const socket = getSocket();
    // Ni ses propres messages ni les messages automatiques (comme le compteur du serveur)
    const handler = (msg) => {
      if (msg?.isSystem || (msg?.authorId && msg.authorId === user?.id)) return;
      setUnreadCount(c => c + 1);
    };
    if (socket) socket.on('chat:message', handler);

    return () => {
      clearInterval(intervalRef.current);
      if (socket) socket.off('chat:message', handler);
    };
  }, [isAuthenticated, refresh, user?.id]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, refresh, markAllRead };
};

export default useChatUnread;
