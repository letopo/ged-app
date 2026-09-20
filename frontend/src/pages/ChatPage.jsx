// frontend/src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Hash, User, Users, Plus, Search, Send, X,
  ChevronDown, Trash2, Edit2, Check, FileText, Lock, Loader,
  MoreVertical, UserPlus, LogOut, Paperclip,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)  return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const fmtFull = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const fmtDay = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const initials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?';

const convName = (conv, user) => {
  if (conv.type === 'direct') {
    return conv.other_first_name
      ? `${conv.other_first_name} ${conv.other_last_name}`
      : conv.name || 'Message direct';
  }
  return conv.name || 'Sans nom';
};

const convIcon = (conv) => {
  if (conv.type === 'direct') return <User size={13} />;
  if (conv.type === 'document') return <FileText size={13} />;
  return <Hash size={13} />;
};

const avatarColor = (str = '') => {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
  let hash = 0;
  for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── @mention highlighting ───────────────────────────────────────────────────

const renderMentions = (content) => {
  if (!content) return null;
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} style={{
          color: 'var(--brand)', fontWeight: 700,
          background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
          borderRadius: 3, padding: '0 2px',
        }}>{part}</span>
      : part
  );
};

// ─── Emojis rapides ──────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','😡','🎉','👏'];

// ─── Composant Avatar ─────────────────────────────────────────────────────────

const Avatar = ({ firstName, lastName, size = 32, isOnline = false }) => {
  const bg = avatarColor(`${firstName}${lastName}`);
  const inits = initials(firstName, lastName);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.38,
        userSelect: 'none',
      }}>
        {inits}
      </div>
      {isOnline && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.3, height: size * 0.3,
          borderRadius: '50%', background: '#22c55e',
          border: '2px solid var(--surface)',
        }} />
      )}
    </div>
  );
};

// ─── Bulle de message ─────────────────────────────────────────────────────────

const MessageBubble = ({ msg, isMine, showHeader, onEdit, onDelete, onReact, onlineUsers = new Set(), currentUserId }) => {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const submitEdit = () => {
    if (editVal.trim() && editVal.trim() !== msg.content) onEdit(msg.id, editVal.trim());
    setEditing(false);
  };

  if (msg.isDeleted) {
    return (
      <div style={{ padding: '2px 12px 2px 52px', color: 'var(--fg-muted)', fontStyle: 'italic', fontSize: 13 }}>
        [Message supprimé]
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', padding: showHeader ? '8px 12px 2px' : '1px 12px',
        background: hover ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 2 }}>
          <Avatar
            firstName={msg.author_first_name || msg.authorFirstName}
            lastName={msg.author_last_name || msg.authorLastName}
            size={32}
            isOnline={onlineUsers.has(msg.author_id || msg.authorId)}
          />
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg)' }}>
              {msg.author_first_name || msg.authorFirstName} {msg.author_last_name || msg.authorLastName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 8 }}>
              {fmtFull(msg.created_at || msg.createdAt)}
            </span>
            {msg.editedAt && (
              <span style={{ fontSize: 10, color: 'var(--fg-subtle)', marginLeft: 6 }}>(modifié)</span>
            )}
          </div>
        </div>
      )}

      <div style={{ paddingLeft: showHeader ? 42 : 42 }}>
        {!showHeader && hover && (
          <span style={{ fontSize: 10, color: 'var(--fg-muted)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {fmtFull(msg.created_at || msg.createdAt)}
          </span>
        )}

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <textarea
              ref={inputRef}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                if (e.key === 'Escape') setEditing(false);
              }}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--brand)', background: 'var(--surface)',
                color: 'var(--fg)', fontSize: 14, resize: 'none', minHeight: 60,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
              <button onClick={submitEdit} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
                Enregistrer
              </button>
              <button onClick={() => setEditing(false)} style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
                Annuler
              </button>
              <span style={{ alignSelf: 'center' }}>Échap pour annuler, Entrée pour enregistrer</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {renderMentions(msg.content)}
          </div>
        )}

        {msg.attachment_path && (
          <a
            href={`/api/uploads/${msg.attachment_path}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--brand)', marginTop: 4 }}
          >
            <Paperclip size={12} /> {msg.attachment_name || 'Pièce jointe'}
          </a>
        )}

        {/* Réactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {msg.reactions.map(r => {
              const reacted = r.users?.some(u => u.id === currentUserId);
              const names = r.users?.map(u => `${u.firstName || u.first_name} ${u.lastName || u.last_name}`).join(', ');
              return (
                <button
                  key={r.emoji}
                  title={names}
                  onClick={() => onReact && onReact(msg.id, r.emoji)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 7px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
                    border: `1px solid ${reacted ? 'var(--brand)' : 'var(--border)'}`,
                    background: reacted ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--surface-2)',
                    color: 'var(--fg)',
                  }}
                >
                  {r.emoji} <span style={{ fontSize: 11, fontWeight: 600 }}>{r.users?.length || 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Barre d'actions au survol */}
      {hover && !editing && (
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 4,
        }}>
          {/* Emoji picker toggle */}
          <div style={{ position: 'relative' }}>
            <ActionBtn
              icon={<span style={{ fontSize: 13 }}>😊</span>}
              title="Réagir"
              onClick={() => setShowPicker(v => !v)}
            />
            {showPicker && (
              <div
                style={{
                  position: 'absolute', bottom: 30, right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '6px 8px', display: 'flex', gap: 4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 50, whiteSpace: 'nowrap',
                }}
                onMouseLeave={() => setShowPicker(false)}
              >
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { onReact && onReact(msg.id, e); setShowPicker(false); }}
                    style={{
                      fontSize: 20, border: 'none', background: 'transparent',
                      cursor: 'pointer', padding: '2px 3px', borderRadius: 6,
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.transform = 'scale(1.3)'}
                    onMouseLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isMine && (
            <>
              <ActionBtn icon={<Edit2 size={13} />} title="Modifier" onClick={() => { setEditVal(msg.content); setEditing(true); setShowPicker(false); }} />
              <ActionBtn icon={<Trash2 size={13} />} title="Supprimer" onClick={() => onDelete(msg.id)} danger />
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ActionBtn = ({ icon, title, onClick, danger }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 4,
      background: 'var(--surface)', color: danger ? 'var(--danger)' : 'var(--fg-muted)',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
    }}
  >
    {icon}
  </button>
);

// ─── Zone de saisie ───────────────────────────────────────────────────────────

const MessageInput = ({ onSend, convId, disabled, members = [] }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef = useRef(null);
  const typingRef = useRef(false);
  const socket = getSocket();

  const emitTyping = useCallback(() => {
    if (!typingRef.current && socket && convId) {
      typingRef.current = true;
      socket.emit('chat:typing', { conversationId: convId });
      setTimeout(() => { typingRef.current = false; }, 2500);
    }
  }, [socket, convId]);

  const getMentionMatch = (val) => val.match(/@(\w*)$/);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    emitTyping();
    const match = getMentionMatch(val);
    if (match) {
      const q = match[1].toLowerCase();
      const filtered = members.filter(m => {
        const u = (m.username || '').toLowerCase();
        const fn = (m.first_name || '').toLowerCase();
        const ln = (m.last_name || '').toLowerCase();
        return u.startsWith(q) || fn.startsWith(q) || `${fn} ${ln}`.startsWith(q);
      }).slice(0, 5);
      setMentionSuggestions(filtered);
      setMentionIdx(0);
    } else {
      setMentionSuggestions([]);
    }
  };

  const selectMention = (m) => {
    const handle = m.username || `${m.first_name}.${m.last_name}`.toLowerCase();
    const newText = text.replace(/@\w*$/, `@${handle} `);
    setText(newText);
    setMentionSuggestions([]);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; ta.focus(); }
    }, 0);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    setMentionSuggestions([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await onSend({ content });
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const handleKey = (e) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionSuggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); selectMention(mentionSuggestions[mentionIdx]); return; }
      if (e.key === 'Escape')    { setMentionSuggestions([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', position: 'relative' }}>

      {/* Dropdown @mention */}
      {mentionSuggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 16, right: 16, marginBottom: 4,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 200,
        }}>
          {mentionSuggestions.map((m, i) => (
            <div
              key={m.user_id || m.id || i}
              onMouseDown={e => { e.preventDefault(); selectMention(m); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer',
                background: i === mentionIdx ? 'var(--surface-2)' : 'transparent',
              }}
              onMouseEnter={() => setMentionIdx(i)}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: avatarColor(`${m.first_name}${m.last_name}`),
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {(m.first_name?.[0] || '')}{(m.last_name?.[0] || '')}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13 }}>{m.first_name} {m.last_name}</span>
              {m.username && <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>@{m.username}</span>}
            </div>
          ))}
          <div style={{ padding: '3px 12px 6px', fontSize: 10, color: 'var(--fg-muted)' }}>
            ↑↓ naviguer · Tab/Entrée pour insérer · Échap pour fermer
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          disabled={disabled || sending}
          placeholder="Écrire un message… @ pour mentionner"
          rows={1}
          style={{
            flex: 1, border: 'none', background: 'transparent', color: 'var(--fg)',
            fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
            maxHeight: 160, overflowY: 'auto', lineHeight: 1.5,
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: text.trim() ? 'var(--brand)' : 'var(--border)',
            color: text.trim() ? '#fff' : 'var(--fg-muted)',
            cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          {sending ? <Loader size={14} className="spin" /> : <Send size={14} />}
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, paddingLeft: 2 }}>
        @ pour mentionner · Maj+Entrée pour retour à la ligne
      </div>
    </div>
  );
};

// ─── Thread de messages ───────────────────────────────────────────────────────

const MessageThread = ({ conv, user, onBack, onlineUsers }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const typingTimers = useRef({});
  const socket = getSocket();

  useEffect(() => {
    if (!conv) return;
    setLoading(true);
    setMessages([]);
    setHasMore(true);

    chatService.getMessages(conv.id).then(msgs => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
    }).catch(() => setLoading(false));

    chatService.markAsRead(conv.id);
    chatService.getMembers(conv.id).then(setMembers).catch(() => {});

    if (socket) socket.emit('chat:join', conv.id);
    return () => { if (socket) socket.emit('chat:leave', conv.id); };
  }, [conv?.id]);

  useEffect(() => {
    if (!socket || !conv) return;

    const handleMsg = (msg) => {
      if (msg.conversationId !== conv.id && msg.conversation_id !== conv.id) return;
      setMessages(prev => [...prev, msg]);
      chatService.markAsRead(conv.id);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleTyping = ({ userId: uid, conversationId }) => {
      if (conversationId !== conv.id || uid === user?.id) return;
      const typingUser = members.find(m => m.user_id === uid);
      const name = typingUser ? `${typingUser.first_name} ${typingUser.last_name}` : 'Quelqu\'un';
      setTypingUsers(prev => ({ ...prev, [uid]: name }));
      clearTimeout(typingTimers.current[uid]);
      typingTimers.current[uid] = setTimeout(() => {
        setTypingUsers(prev => { const n = { ...prev }; delete n[uid]; return n; });
      }, 3000);
    };

    const handleEdit = ({ id, content, editedAt }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, editedAt } : m));
    };

    const handleDelete = ({ id }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, content: '' } : m));
    };

    const handleReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    };

    socket.on('chat:message', handleMsg);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:message_edited', handleEdit);
    socket.on('chat:message_deleted', handleDelete);
    socket.on('chat:reaction', handleReaction);

    return () => {
      socket.off('chat:message', handleMsg);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:message_edited', handleEdit);
      socket.off('chat:message_deleted', handleDelete);
      socket.off('chat:reaction', handleReaction);
    };
  }, [socket, conv?.id, user?.id, members]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoadingMore(true);
    const prev = await chatService.getMessages(conv.id, oldest.id).catch(() => []);
    if (prev.length === 0) { setHasMore(false); }
    else {
      const scrollEl = listRef.current;
      const prevHeight = scrollEl?.scrollHeight || 0;
      setMessages(old => [...prev, ...old]);
      setTimeout(() => {
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevHeight;
      }, 0);
    }
    setLoadingMore(false);
  };

  const handleSend = async (data) => {
    await chatService.sendMessage(conv.id, data);
  };

  const handleEdit = async (id, content) => {
    const updated = await chatService.editMessage(id, content).catch(() => null);
    if (updated) setMessages(prev => prev.map(m => m.id === id ? { ...m, content: updated.content, editedAt: updated.editedAt } : m));
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce message ?')) return;
    await chatService.deleteMessage(id).catch(() => null);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, content: '' } : m));
  };

  const handleReact = async (messageId, emoji) => {
    const result = await chatService.toggleReaction(conv.id, messageId, emoji).catch(() => null);
    if (result) setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: result } : m));
  };

  const typingNames = Object.values(typingUsers);

  // Group messages by day + detect header
  const grouped = [];
  let lastDay = null;
  let lastAuthor = null;
  let lastTime = null;

  for (const msg of messages) {
    const day = fmtDay(msg.created_at || msg.createdAt);
    if (day !== lastDay) {
      grouped.push({ type: 'divider', label: day, key: `d-${day}` });
      lastDay = day;
      lastAuthor = null;
    }
    const author = msg.author_id || msg.authorId;
    const time = new Date(msg.created_at || msg.createdAt).getTime();
    const showHeader = author !== lastAuthor || (time - lastTime) > 5 * 60_000;
    grouped.push({ type: 'msg', msg, showHeader, key: msg.id });
    lastAuthor = author;
    lastTime = time;
  }

  const name = convName(conv, user);
  const icon = convIcon(conv);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Header */}
      <div style={{
        padding: '0 16px', height: 52, display: 'flex', alignItems: 'center',
        gap: 10, borderBottom: '1px solid var(--border)', flexShrink: 0,
        background: 'var(--surface)',
      }}>
        <button onClick={onBack} style={{ display: 'none', padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)' }}>
          ←
        </button>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-soft, color-mix(in srgb, var(--brand) 12%, transparent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          {conv.description && (
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.description}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowMembers(v => !v)}
          title="Membres"
          style={{
            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: showMembers ? 'var(--surface-2)' : 'transparent',
            color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}
        >
          <Users size={14} /> {members.length}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            ref={listRef}
            style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}
            onScroll={e => { if (e.target.scrollTop < 80) loadMore(); }}
          >
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: 8 }}>
                <Loader size={16} style={{ color: 'var(--fg-muted)' }} />
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--fg-muted)' }}>
                Début de la conversation
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={24} style={{ color: 'var(--brand)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
                <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 14 }}>Aucun message pour l'instant</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Soyez le premier à écrire !</div>
              </div>
            ) : (
              grouped.map(item => item.type === 'divider' ? (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', margin: '4px 0',
                }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{item.label}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              ) : (
                <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  isMine={(item.msg.author_id || item.msg.authorId) === user?.id}
                  showHeader={item.showHeader}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onlineUsers={onlineUsers}
                  currentUserId={user?.id}
                />
              ))
            )}

            {typingNames.length > 0 && (
              <div style={{ padding: '4px 16px 4px 54px', fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                {typingNames.join(', ')} {typingNames.length === 1 ? 'est en train d\'écrire…' : 'sont en train d\'écrire…'}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <MessageInput onSend={handleSend} convId={conv.id} disabled={loading} members={members} />
        </div>

        {/* Panel membres */}
        {showMembers && (
          <div style={{
            width: 220, borderLeft: '1px solid var(--border)', background: 'var(--surface)',
            overflow: 'hidden auto', padding: '12px 0', flexShrink: 0,
          }}>
            <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Membres — {members.length}
            </div>
            {members.map(m => {
              const online = onlineUsers.has(m.user_id);
              return (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}>
                  <Avatar firstName={m.first_name} lastName={m.last_name} size={28} isOnline={online} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.first_name} {m.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: online ? '#22c55e' : 'var(--fg-muted)' }}>
                      {online ? 'En ligne' : m.role}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Élément de conversation dans la liste ────────────────────────────────────

const ConvItem = ({ conv, active, onClick, user, onlineUsers = new Set() }) => {
  const name = convName(conv, user);
  const icon = convIcon(conv);
  const preview = conv.last_deleted
    ? '[Message supprimé]'
    : conv.last_content
    ? (conv.last_content.length > 55 ? conv.last_content.slice(0, 55) + '…' : conv.last_content)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
        background: active ? 'var(--surface-2)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {conv.type === 'direct' && conv.other_first_name ? (
          <Avatar firstName={conv.other_first_name} lastName={conv.other_last_name} size={32} isOnline={onlineUsers.has(conv.other_user_id)} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: active ? 'var(--brand)' : 'var(--surface-3, var(--surface-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: active ? '#fff' : 'var(--fg-muted)',
          }}>
            {icon}
          </div>
        )}
        {conv.unread_count > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {conv.unread_count > 99 ? '99+' : conv.unread_count}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontSize: 13.5, fontWeight: conv.unread_count > 0 ? 700 : 500,
            color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '70%',
          }}>{name}</span>
          {conv.last_at && (
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', flexShrink: 0 }}>{fmt(conv.last_at)}</span>
          )}
        </div>
        {preview && (
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {conv.last_author_name && conv.type !== 'direct' ? `${conv.last_author_name.split(' ')[0]}: ` : ''}
            {preview}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Modal nouvelle conversation ──────────────────────────────────────────────

const NewConvModal = ({ onClose, onCreate, currentUser, onlineUsers = new Set() }) => {
  const [tab, setTab] = useState('channel');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setUsers([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await chatService.searchUsers(q).catch(() => []);
      setUsers(res.filter(u => u.id !== currentUser?.id));
      setSearchLoading(false);
    }, 300);
  }, [currentUser?.id]);

  useEffect(() => { doSearch(search); }, [search, doSearch]);

  const toggleUser = (u) => {
    if (tab === 'direct') {
      setSelected([u]);
    } else {
      setSelected(prev => prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        type: tab,
        name: tab === 'channel' ? name.trim() : null,
        description: tab === 'channel' ? desc.trim() : null,
        memberIds: selected.map(u => u.id),
      };
      await onCreate(payload);
      onClose();
    } catch (_) {
      setSaving(false);
    }
  };

  const canCreate = tab === 'direct'
    ? selected.length === 1
    : name.trim().length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 24,
        width: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Nouvelle conversation</div>
          <button onClick={onClose} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['channel', 'Canal', <Hash size={14} />], ['direct', 'Message direct', <User size={14} />]].map(([t, l, ic]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected([]); }}
              style={{
                flex: 1, padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--brand)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--fg-muted)',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {ic} {l}
            </button>
          ))}
        </div>

        {tab === 'channel' && (
          <>
            <input
              autoFocus
              placeholder="Nom du canal (ex: annonces)"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14, marginBottom: 10, outline: 'none', fontFamily: 'inherit' }}
            />
            <textarea
              placeholder="Description (optionnel)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14, marginBottom: 10, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
            />
          </>
        )}

        {/* Recherche utilisateurs */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            placeholder={tab === 'direct' ? 'Chercher un utilisateur…' : 'Ajouter des membres…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {selected.map(u => (
              <span key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--brand)', color: '#fff', borderRadius: 12, fontSize: 12 }}>
                {u.firstName || u.first_name} {u.lastName || u.last_name}
                <button onClick={() => toggleUser(u)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: 200 }}>
          {searchLoading && <div style={{ textAlign: 'center', padding: 8, color: 'var(--fg-muted)', fontSize: 13 }}>Recherche…</div>}
          {users.map(u => (
            <div
              key={u.id}
              onClick={() => toggleUser(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                borderRadius: 6, cursor: 'pointer',
                background: selected.find(x => x.id === u.id) ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'transparent',
              }}
              onMouseEnter={e => { if (!selected.find(x => x.id === u.id)) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!selected.find(x => x.id === u.id)) e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar firstName={u.firstName || u.first_name} lastName={u.lastName || u.last_name} size={28} isOnline={onlineUsers.has(u.id)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                  {u.firstName || u.first_name} {u.lastName || u.last_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{u.email}</div>
              </div>
              {selected.find(x => x.id === u.id) && <Check size={14} style={{ color: 'var(--brand)' }} />}
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!canCreate || saving}
          style={{
            marginTop: 16, padding: '10px 0', borderRadius: 8, border: 'none',
            background: canCreate ? 'var(--brand)' : 'var(--border)',
            color: canCreate ? '#fff' : 'var(--fg-muted)',
            fontSize: 14, fontWeight: 600, cursor: canCreate ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Création…' : tab === 'direct' ? 'Ouvrir la conversation' : 'Créer le canal'}
        </button>
      </div>
    </div>
  );
};

// ─── Page principale Chat ─────────────────────────────────────────────────────

const ChatPage = () => {
  const { user } = useAuth();
  const { convId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(convId || null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socket = getSocket();

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMsg = (msg) => {
      setConversations(prev => prev.map(c => {
        if (c.id !== (msg.conversationId || msg.conversation_id)) return c;
        return {
          ...c,
          last_content: msg.content,
          last_at: msg.createdAt || msg.created_at,
          last_author_name: `${msg.authorFirstName || ''} ${msg.authorLastName || ''}`.trim(),
          unread_count: c.id !== selectedId ? (parseInt(c.unread_count) || 0) + 1 : 0,
          last_message_at: msg.createdAt || msg.created_at,
        };
      }).sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at)));
    };

    socket.on('chat:message', handleNewMsg);
    return () => socket.off('chat:message', handleNewMsg);
  }, [socket, selectedId]);

  useEffect(() => {
    if (!socket) return;

    const handleUsersOnline = ({ userIds }) => setOnlineUsers(new Set(userIds));
    const handleUserOnline = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]));
    const handleUserOffline = ({ userId }) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
    // Le serveur n'envoie le snapshot 'users:online' qu'une fois, à la connexion du socket
    // (qui a lieu dès le login, bien avant l'ouverture de cette page) : il faut le redemander ici.
    const requestSnapshot = () => socket.emit('presence:request');

    socket.on('users:online', handleUsersOnline);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('connect', requestSnapshot);
    requestSnapshot();

    return () => {
      socket.off('users:online', handleUsersOnline);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('connect', requestSnapshot);
    };
  }, [socket]);

  const selectedConv = conversations.find(c => c.id === selectedId) || null;

  const selectConv = (id) => {
    setSelectedId(id);
    navigate(`/chat/${id}`, { replace: true });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
  };

  const handleCreate = async (payload) => {
    const res = await chatService.createConversation(payload);
    if (res?.data?.id) {
      await loadConversations();
      selectConv(res.data.id);
    }
  };

  const tabs = [
    { key: 'all', label: 'Tout' },
    { key: 'channel', label: 'Canaux' },
    { key: 'direct', label: 'Messages' },
    { key: 'document', label: 'Documents' },
  ];

  const filtered = conversations.filter(c => {
    if (activeTab !== 'all' && c.type !== activeTab) return false;
    if (search) {
      const n = convName(c, user).toLowerCase();
      return n.includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* ── Panneau gauche ── */}
      <div style={{
        width: 280, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        background: 'var(--surface)',
      }}>
        {/* En-tête */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageSquare size={16} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Discussion</span>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              title="Nouvelle conversation"
              style={{
                width: 26, height: 26, borderRadius: 6, border: 'none',
                background: 'var(--brand)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Recherche */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
            <input
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '5px 10px 5px 28px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                color: 'var(--fg)', fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '4px 0', border: 'none', background: 'transparent',
                color: activeTab === t.key ? 'var(--brand)' : 'var(--fg-muted)',
                fontWeight: activeTab === t.key ? 700 : 400,
                fontSize: 11.5, cursor: 'pointer', borderBottom: activeTab === t.key ? '2px solid var(--brand)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader size={20} style={{ color: 'var(--brand)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--fg-muted)', fontSize: 13 }}>
              {search ? 'Aucun résultat' : 'Aucune conversation'}
            </div>
          ) : (
            filtered.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                active={c.id === selectedId}
                onClick={() => selectConv(c.id)}
                user={user}
                onlineUsers={onlineUsers}
              />
            ))
          )}
        </div>

        {/* Bouton nouveau (bas) */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 7, border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            <Plus size={13} /> Nouvelle conversation
          </button>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedConv ? (
          <MessageThread
            key={selectedConv.id}
            conv={selectedConv}
            user={user}
            onBack={() => setSelectedId(null)}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-muted)',
          }}>
            <MessageSquare size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
              Module Discussion
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg-muted)', textAlign: 'center', maxWidth: 320 }}>
              Sélectionnez une conversation dans la liste ou créez-en une nouvelle.
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--brand)', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={14} /> Nouvelle conversation
            </button>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewConvModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
          currentUser={user}
          onlineUsers={onlineUsers}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
};

export default ChatPage;
