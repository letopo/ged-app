// frontend/src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Hash, User, Users, Plus, Search, Send, X,
  ChevronDown, Trash2, Edit2, Check, FileText, Lock, Loader,
  MoreVertical, UserPlus, LogOut, Paperclip, Copy, Bell, BellOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';
import i18n from '../i18n/config';
import {
  fmt, fmtDay, convName, convIcon, avatarColor, Avatar, MessageBubble, MessageInput,
  useReadTracking, readReceipt, SeenLine,
} from '../components/chat/ChatMessages';
import DocumentBanner from '../components/chat/DocumentBanner';

// ─── Thread de messages ───────────────────────────────────────────────────────

const MessageThread = ({ conv, user, onBack, onlineUsers, onMutedChange }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState({});
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [muted, setMuted] = useState(!!conv.muted);
  // Conversation affichée : lue seulement si l'écran est visible ; ✓✓ en direct
  const markRead = useReadTracking(conv.id, setMembers);
  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    const ok = await chatService.setMuted(conv.id, next).catch(() => null);
    if (ok === null) setMuted(!next); else onMutedChange?.(conv.id, next);
  };
  const [droppedFiles, setDroppedFiles] = useState(null);
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

    markRead();
    chatService.getMembers(conv.id).then(setMembers).catch(() => {});

    if (socket) socket.emit('chat:join', conv.id);
    return () => { if (socket) socket.emit('chat:leave', conv.id); };
  }, [conv?.id]);

  useEffect(() => {
    if (!socket || !conv) return;

    const handleMsg = (msg) => {
      if (msg.conversationId !== conv.id && msg.conversation_id !== conv.id) return;
      setMessages(prev => [...prev, msg]);
      // Document de la GED : le droit de l'ouvrir est propre à chacun
      if (msg.attachmentDocumentId) {
        chatService.getMessage(msg.id).then(full => {
          if (full) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...full } : m));
        }).catch(() => {});
      }
      markRead();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleTyping = ({ userId: uid, conversationId }) => {
      if (conversationId !== conv.id || uid === user?.id) return;
      const typingUser = members.find(m => m.user_id === uid);
      const name = typingUser ? `${typingUser.first_name} ${typingUser.last_name}` : t("Quelqu'un");
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
    const sent = await chatService.sendMessage(conv.id, data);
    if (sent?.added?.some(a => a.joined)) chatService.getMembers(conv.id).then(setMembers).catch(() => {});
    return sent;
  };
  // Discussion d'un document : on peut mentionner tout collègue (il reçoit le document)
  const mentionSearch = conv.type === 'document' ? (q) => chatService.getMentionCandidates(conv.id, q) : undefined;

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
        {/* Retour à la liste : visible sur mobile seulement (cf. index.css .chat-back) */}
        <button onClick={onBack} className="chat-back" aria-label={t('Retour aux conversations')} style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg)', fontSize: 20, lineHeight: 1 }}>
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
          onClick={toggleMute}
          title={muted ? t('Réactiver les notifications') : t('Mettre en sourdine (plus de notifications)')}
          aria-label={muted ? t('Réactiver les notifications') : t('Mettre en sourdine')}
          style={{
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', marginRight: 6,
            background: muted ? 'var(--surface-2)' : 'transparent',
            color: muted ? 'var(--warning, var(--fg-muted))' : 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          {muted ? <BellOff size={14} /> : <Bell size={14} />}
        </button>
        <button
          onClick={() => setShowMembers(v => !v)}
          title={t('Membres')}
          style={{
            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: showMembers ? 'var(--surface-2)' : 'transparent',
            color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}
        >
          <Users size={14} /> {members.length}
        </button>
      </div>

      {conv.type === 'document' && conv.document_id && <DocumentBanner conversationId={conv.id} />}

      <div className="chat-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Messages (un fichier glissé ici est ajouté au message en cours) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}
          onDragOver={e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
          onDrop={e => { if (e.dataTransfer.files?.length) { e.preventDefault(); setDroppedFiles({ files: [...e.dataTransfer.files] }); } setDragOver(false); }}>
          {dragOver && (
            <div style={{ position: 'absolute', inset: 8, zIndex: 50, borderRadius: 12, border: '2px dashed var(--brand)', background: 'color-mix(in srgb, var(--brand) 10%, var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--brand)', fontWeight: 600, fontSize: 14, pointerEvents: 'none' }}>
              <Paperclip size={18} /> {t('Déposez le fichier pour le joindre')}
            </div>
          )}
          <div
            ref={listRef}
            style={{ flex: 1, overflowY: 'auto', padding: '8px 0 12px', background: 'var(--chat-wall)' }}
            onScroll={e => { if (e.target.scrollTop < 80) loadMore(); }}
          >
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: 8 }}>
                <Loader size={16} style={{ color: 'var(--fg-muted)' }} />
              </div>
            )}
            {!hasMore && messages.length > 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--fg-muted)' }}>
                {t('Début de la conversation')}
              </div>
            )}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader size={24} style={{ color: 'var(--brand)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 48, color: 'var(--fg-muted)' }}>
                <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 14 }}>{t("Aucun message pour l'instant")}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{t('Soyez le premier à écrire !')}</div>
              </div>
            ) : (
              grouped.map(item => item.type === 'divider' ? (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px 4px', position: 'sticky', top: 0, zIndex: 2 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: 999, background: 'var(--chat-other-bg)', boxShadow: 'var(--chat-bubble-shadow)' }}>{item.label}</span>
                </div>
              ) : (
                <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  isMine={(item.msg.author_id || item.msg.authorId) === user?.id}
                  showHeader={item.showHeader}
                  isGroup={conv.type !== 'direct'}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onReact={handleReact}
                  onlineUsers={onlineUsers}
                  currentUserId={user?.id}
                  receipt={(item.msg.author_id || item.msg.authorId) === user?.id ? readReceipt(item.msg, members, user?.id) : null}
                />
              ))
            )}

            {/* « Vu à… » / « Vu par… » sous mon dernier message */}
            {(() => {
              const last = messages[messages.length - 1];
              if (!last || (last.author_id || last.authorId) !== user?.id || last.is_system || last.isSystem) return null;
              return <SeenLine receipt={readReceipt(last, members, user?.id)} isGroup={conv.type !== 'direct'} />;
            })()}

            {typingNames.length > 0 && (
              <div style={{ padding: '6px 16px 0', fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                {typingNames.join(', ')} {typingNames.length === 1 ? t("est en train d'écrire…") : t("sont en train d'écrire…")}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <MessageInput onSend={handleSend} convId={conv.id} disabled={loading} members={members} droppedFiles={droppedFiles} mentionSearch={mentionSearch} />
        </div>

        {/* Panel membres */}
        {showMembers && (
          <div className="chat-members" style={{
            width: 220, borderLeft: '1px solid var(--border)', background: 'var(--surface)',
            overflow: 'hidden auto', padding: '12px 0', flexShrink: 0,
          }}>
            <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('Membres — {{count}}', { count: members.length })}
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
                      {online ? t('En ligne') : m.role}
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
  const { t } = useTranslation();
  const name = convName(conv, user);
  const icon = convIcon(conv);
  const preview = conv.last_deleted
    ? t('[Message supprimé]')
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
          {conv.muted && <BellOff size={12} style={{ color: 'var(--fg-subtle)', flexShrink: 0, marginLeft: 4 }} aria-label={t('En sourdine')} />}
          <span style={{ flex: 1 }} />
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
  const { t } = useTranslation();
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="chat-new-modal" style={{
        background: 'var(--surface)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{t('Nouvelle conversation')}</div>
          <button onClick={onClose} style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['channel', 'Canal', <Hash size={14} />], ['direct', 'Message direct', <User size={14} />]].map(([tabKey, l, ic]) => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setSelected([]); }}
              style={{
                flex: 1, padding: '8px 12px', border: 'none', cursor: 'pointer',
                background: tab === tabKey ? 'var(--brand)' : 'transparent',
                color: tab === tabKey ? '#fff' : 'var(--fg-muted)',
                fontSize: 13, fontWeight: tab === tabKey ? 600 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {ic} {t(l)}
            </button>
          ))}
        </div>

        {tab === 'channel' && (
          <>
            <input
              autoFocus
              placeholder={t('Nom du canal (ex: annonces)')}
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 14, marginBottom: 10, outline: 'none', fontFamily: 'inherit' }}
            />
            <textarea
              placeholder={t('Description (optionnel)')}
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
            placeholder={tab === 'direct' ? t('Chercher un utilisateur…') : t('Ajouter des membres…')}
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
          {searchLoading && <div style={{ textAlign: 'center', padding: 8, color: 'var(--fg-muted)', fontSize: 13 }}>{t('Recherche…')}</div>}
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
          {saving ? t('Création…') : tab === 'direct' ? t('Ouvrir la conversation') : t('Créer le canal')}
        </button>
      </div>
    </div>
  );
};

// ─── Page principale Chat ─────────────────────────────────────────────────────

const ChatPage = () => {
  const { t } = useTranslation();
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
          last_content: msg.content || (msg.attachmentDocumentId ? `📎 ${t('Document de la GED')}` : msg.attachmentName ? `📎 ${msg.attachmentName}` : ''),
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
    { key: 'all', label: t('Tout') },
    { key: 'channel', label: t('Canaux') },
    { key: 'direct', label: t('Messages') },
    { key: 'document', label: t('Documents') },
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
    <div className={`chat-root${selectedConv ? ' has-selection' : ''}`} style={{ display: 'flex', height: '100%', background: 'var(--surface)', overflow: 'hidden' }}>
      {/* ── Panneau gauche ── (mobile : liste OU conversation, cf. index.css .chat-*) */}
      <div className="chat-list" style={{
        width: 280, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        background: 'var(--surface)',
      }}>
        {/* En-tête */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MessageSquare size={16} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{t('Discussion')}</span>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              title={t('Nouvelle conversation')}
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
              placeholder={t('Rechercher…')}
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
          {tabs.map(tb => (
            <button
              key={tb.key}
              onClick={() => setActiveTab(tb.key)}
              style={{
                flex: 1, padding: '4px 0', border: 'none', background: 'transparent',
                color: activeTab === tb.key ? 'var(--brand)' : 'var(--fg-muted)',
                fontWeight: activeTab === tb.key ? 700 : 400,
                fontSize: 11.5, cursor: 'pointer', borderBottom: activeTab === tb.key ? '2px solid var(--brand)' : '2px solid transparent',
              }}
            >
              {tb.label}
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
              {search ? t('Aucun résultat') : t('Aucune conversation')}
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
            <Plus size={13} /> {t('Nouvelle conversation')}
          </button>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="chat-thread" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedConv ? (
          <MessageThread
            key={selectedConv.id}
            conv={selectedConv}
            user={user}
            onBack={() => setSelectedId(null)}
            onlineUsers={onlineUsers}
            onMutedChange={(id, m) => setConversations(prev => prev.map(c => (c.id === id ? { ...c, muted: m } : c)))}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-muted)',
          }}>
            <MessageSquare size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>
              {t('Module Discussion')}
            </div>
            <div style={{ fontSize: 14, color: 'var(--fg-muted)', textAlign: 'center', maxWidth: 320 }}>
              {t('Sélectionnez une conversation dans la liste ou créez-en une nouvelle.')}
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--brand)', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={14} /> {t('Nouvelle conversation')}
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
