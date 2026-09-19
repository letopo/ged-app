// frontend/src/components/DocumentDiscussion.jsx
// Composant embarquable dans les pages document pour ouvrir la discussion associée
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, X, Loader, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';

const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const avatarColor = (str = '') => {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const Avatar = ({ fn, ln, size = 26 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: avatarColor(`${fn}${ln}`), color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, userSelect: 'none',
  }}>
    {(fn?.[0] || '')}{ (ln?.[0] || '')}
  </div>
);

const DocumentDiscussion = ({ documentId, documentTitle }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const socket = getSocket();

  const loadThread = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const c = await chatService.getOrCreateDocumentThread(documentId);
      setConv(c);
      const msgs = await chatService.getMessages(c.id);
      setMessages(msgs);
      await chatService.markAsRead(c.id);
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
      if (open) {
        chatService.markAsRead(conv.id);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        setUnread(u => u + 1);
      }
    };

    socket.on('chat:message', handleMsg);
    return () => socket.off('chat:message', handleMsg);
  }, [socket, conv?.id, open]);

  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80);
    }
  }, [open, messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending || !conv) return;
    const content = text.trim();
    setSending(true);
    setText('');
    try {
      await chatService.sendMessage(conv.id, { content });
    } catch (_) {}
    setSending(false);
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Fermer la discussion' : 'Discussion du document'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
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
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 1000,
          width: 360, height: 480, borderRadius: 12,
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
                {documentTitle || 'Discussion du document'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Discussion</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ padding: 4, border: 'none', background: 'rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Loader size={20} style={{ color: 'var(--brand)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--fg-muted)' }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>Aucun message</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Démarrez la discussion sur ce document</div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMine = (msg.author_id || msg.authorId) === user?.id;
                const prev = messages[i - 1];
                const sameAuthor = prev && (prev.author_id || prev.authorId) === (msg.author_id || msg.authorId);
                const fn = msg.author_first_name || msg.authorFirstName || '';
                const ln = msg.author_last_name || msg.authorLastName || '';

                return (
                  <div key={msg.id} style={{ marginBottom: 2 }}>
                    {!sameAuthor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, marginBottom: 2 }}>
                        <Avatar fn={fn} ln={ln} size={24} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>
                          {isMine ? 'Vous' : `${fn} ${ln}`}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                          {fmtTime(msg.created_at || msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div style={{
                      marginLeft: 31, fontSize: 13, color: 'var(--fg)',
                      lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      fontStyle: msg.isDeleted ? 'italic' : 'normal',
                      color: msg.isDeleted ? 'var(--fg-muted)' : 'var(--fg)',
                    }}>
                      {msg.isDeleted ? '[Message supprimé]' : msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Écrire un message…"
                rows={1}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 7, fontFamily: 'inherit',
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--fg)', fontSize: 13, resize: 'none', outline: 'none',
                  maxHeight: 90, overflowY: 'auto',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 34, height: 34, borderRadius: 7, border: 'none',
                  background: text.trim() ? 'var(--brand)' : 'var(--border)',
                  color: text.trim() ? '#fff' : 'var(--fg-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0,
                }}
              >
                {sending ? <Loader size={14} /> : <Send size={14} />}
              </button>
            </div>
          </div>
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
