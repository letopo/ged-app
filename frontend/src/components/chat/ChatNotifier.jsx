// frontend/src/components/chat/ChatNotifier.jsx
// Notifications de la discussion, montées une seule fois dans l'application :
//  - dit au serveur si l'application est à l'écran (app:visibility) : il envoie
//    alors une alerte ici plutôt qu'une notification sur l'appareil (push) ;
//  - affiche l'alerte d'un nouveau message (chat:notify) : carte cliquable qui
//    ouvre la conversation, avec le son des notifications.
// Le serveur n'alerte jamais pour la conversation déjà affichée ni en sourdine.
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/api';

let sound = null;
const ding = () => {
  try {
    sound ??= Object.assign(new Audio('/notification.wav'), { volume: 0.4 });
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch { /* son indisponible */ }
};

export default function ChatNotifier() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let socket = null;
    let retry = null;

    const visible = () => document.visibilityState === 'visible';
    const announce = () => socket?.emit('app:visibility', visible());
    const onNotify = ({ conversationId, title, body }) => {
      if (window.location.pathname === `/chat/${conversationId}` && visible()) return;
      ding();
      toast((tt) => (
        <button type="button"
          onClick={() => { toast.dismiss(tt.id); navigate(`/chat/${conversationId}`); }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', maxWidth: 320 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageSquare size={15} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
            <span style={{ fontSize: 12.5, opacity: 0.8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{body}</span>
          </span>
        </button>
      ), { id: `chat-${conversationId}`, duration: 6000 });
    };

    // Le socket est ouvert par useNotifications au moment de la connexion : on l'attend
    const attach = () => {
      socket = getSocket();
      if (!socket) { retry = setTimeout(attach, 1000); return; }
      socket.on('connect', announce);
      socket.on('chat:notify', onNotify);
      announce();
    };
    attach();
    document.addEventListener('visibilitychange', announce);
    return () => {
      clearTimeout(retry);
      document.removeEventListener('visibilitychange', announce);
      socket?.off('connect', announce);
      socket?.off('chat:notify', onNotify);
    };
  }, [isAuthenticated, navigate]);

  // Ouvrir une conversation retire son alerte éventuelle
  useEffect(() => {
    const m = location.pathname.match(/^\/chat\/([0-9a-f-]{36})/);
    if (m) toast.dismiss(`chat-${m[1]}`);
  }, [location.pathname]);

  return null;
}
