// frontend/src/components/DocumentDiscussion.jsx
// Composant embarquable dans les pages document pour ouvrir la discussion associée.
// Mêmes bulles et même zone de saisie que la page Discussion (chat/ChatMessages) :
// pièces jointes, réactions, et @mention de tout collègue — la personne
// mentionnée rejoint la discussion et reçoit le document si elle ne pouvait
// pas le lire (règles de « Transmettre », vérifiées par le serveur).
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X, Loader, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';
import { MessageBubble, MessageInput, fmtDay, useReadTracking, readReceipt, SeenLine, useJumpToMessage, quoteOf } from './chat/ChatMessages';

const DocumentDiscussion = ({ documentId, documentTitle }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const socket = getSocket();
  // Panneau ouvert = conversation affichée (pas de notification, ✓✓ en direct)
  const markRead = useReadTracking(conv?.id, setMembers, open);

  const loadThread = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const c = await chatService.getOrCreateDocumentThread(documentId);
      setConv(c);
      const [msgs, mem] = await Promise.all([chatService.getMessages(c.id), chatService.getMembers(c.id).catch(() => [])]);
      setMessages(msgs);
      setMembers(mem);
      if (document.visibilityState === 'visible') await chatService.markAsRead(c.id);
      setUnread(0);
      if (socket) socket.emit('chat:join', c.id);
    } catch (_) {}
    setLoading(false);
  }, [documentId, socket]);

  useEffect(() => {
    if (open) {
      loadThread();
    } else if (conv && socket) {
      socket.emit('chat:leave', conv.id);
    }
  }, [open, documentId]);

  useEffect(() => {
    if (!socket || !conv) return;

    const handleMsg = (msg) => {
      const cid = msg.conversationId || msg.conversation_id;
      if (cid !== conv.id) return;
      setMessages(prev => [...prev, msg]);
      // Document de la GED partagé : le droit de l'ouvrir est propre à chacun
      if (msg.attachmentDocumentId) {
        chatService.getMessage(msg.id).then(full => {
          if (full) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...full } : m));
        }).catch(() => {});
      }
      if (open) {
        markRead();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        setUnread(u => u + 1);
      }
    };
    const handleEdit = ({ id, content, editedAt }) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content, editedAt } : m));
    const handleDelete = ({ id }) => setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, content: '' } : m));
    const handleReaction = ({ messageId, reactions }) => setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));

    socket.on('chat:message', handleMsg);
    socket.on('chat:message_edited', handleEdit);
    socket.on('chat:message_deleted', handleDelete);
    socket.on('chat:reaction', handleReaction);
    return () => {
      socket.off('chat:message', handleMsg);
      socket.off('chat:message_edited', handleEdit);
      socket.off('chat:message_deleted', handleDelete);
      socket.off('chat:reaction', handleReaction);
    };
  }, [socket, conv?.id, open, markRead]);

  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
    }
  }, [open, messages.length]);

  // Messages plus anciens (pour aller à un message cité) ; false quand il n'y en a plus
  const loadOlder = async () => {
    if (!conv || !hasMore || !messages.length) return false;
    const prev = await chatService.getMessages(conv.id, messages[0].id).catch(() => []);
    if (!prev.length) { setHasMore(false); return false; }
    setMessages(old => [...prev, ...old]);
    return true;
  };
  const { jumpTo, highlightId } = useJumpToMessage(listRef, messages, loadOlder);

  const handleSend = async (data) => {
    if (!conv) return null;
    const sent = await chatService.sendMessage(conv.id, data);
    if (sent?.added?.some(a => a.joined)) chatService.getMembers(conv.id).then(setMembers).catch(() => {});
    return sent;
  };
  const handleEdit = async (id, content) => {
    const updated = await chatService.editMessage(id, content).catch(() => null);
    if (updated) setMessages(prev => prev.map(m => m.id === id ? { ...m, content: updated.content, editedAt: updated.editedAt } : m));
  };
  const handleDelete = async (id) => {
    if (!confirm(t('Supprimer ce message ?'))) return;
    await chatService.deleteMessage(id).catch(() => null);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, content: '' } : m));
  };
  const handleReact = async (messageId, emoji) => {
    const result = await chatService.toggleReaction(conv.id, messageId, emoji).catch(() => null);
    if (result) setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: result } : m));
  };

  // Séparateurs de jour et début de série (même auteur à moins de 5 min)
  const items = [];
  let lastDay = null; let lastAuthor = null; let lastTime = 0;
  for (const msg of messages) {
    const day = fmtDay(msg.created_at || msg.createdAt);
    if (day !== lastDay) { items.push({ type: 'divider', label: day, key: `d-${day}` }); lastDay = day; lastAuthor = null; }
    const author = msg.author_id || msg.authorId;
    const time = new Date(msg.created_at || msg.createdAt).getTime();
    items.push({ type: 'msg', msg, showHeader: author !== lastAuthor || time - lastTime > 5 * 60_000, key: msg.id });
    lastAuthor = author; lastTime = time;
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? t('Fermer la discussion') : t('Discussion du document')}
        className="doc-disc-btn"
        style={{
          // Au-dessus de la visionneuse de document (9000), sous ses fenêtres (9500+)
          position: 'fixed', bottom: 24, right: 24, zIndex: 9100,
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: open ? 'var(--fg)' : 'var(--brand)', color: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
            borderRadius: 9, background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panneau de discussion */}
      {open && (
        <div className="doc-disc-panel" style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 9100,
          width: 400, height: 540, borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'slideUpPanel 0.2s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px', borderBottom: '1px solid var(--border)',
            background: 'var(--brand)', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Hash size={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {documentTitle || t('Discussion du document')}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                {members.length > 0 ? t('{{count}} participant(s) · @ pour inviter un collègue', { count: members.length }) : t('Discussion')}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t('Fermer')} style={{ padding: 4, border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0 10px', background: 'var(--chat-wall)' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Loader size={20} style={{ color: 'var(--brand)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>{t('Aucun message')}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{t('Démarrez la discussion sur ce document. Tapez @ pour inviter un collègue : il recevra le document.')}</div>
              </div>
            ) : (
              items.map(item => item.type === 'divider' ? (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'center', padding: '10px 12px 2px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', padding: '3px 10px', borderRadius: 999, background: 'var(--chat-other-bg)', boxShadow: 'var(--chat-bubble-shadow)' }}>{item.label}</span>
                </div>
              ) : (
                <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  isMine={(item.msg.author_id || item.msg.authorId) === user?.id}
                  showHeader={item.showHeader}
                  isGroup
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  currentUserId={user?.id}
                  receipt={(item.msg.author_id || item.msg.authorId) === user?.id ? readReceipt(item.msg, members, user?.id) : null}
                  onReply={(m) => setReplyTo(quoteOf(m))}
                  onJump={jumpTo}
                  highlighted={item.msg.id === highlightId}
                />
              ))
            )}
            {(() => {
              const last = messages[messages.length - 1];
              if (!last || (last.author_id || last.authorId) !== user?.id || last.is_system || last.isSystem) return null;
              return <SeenLine receipt={readReceipt(last, members, user?.id)} isGroup />;
            })()}
            <div ref={bottomRef} />
          </div>

          {conv && (
            <MessageInput
              onSend={handleSend}
              convId={conv.id}
              disabled={loading}
              members={members}
              mentionSearch={(q) => chatService.getMentionCandidates(conv.id, q)}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes slideUpPanel {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default DocumentDiscussion;
