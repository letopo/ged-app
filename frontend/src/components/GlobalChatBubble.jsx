// frontend/src/components/GlobalChatBubble.jsx
// Bulle de discussion globale et discrète, accessible depuis toute l'application
// (masquée sur /chat où la page complète existe déjà, et sur mobile)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, ArrowLeft, Search, Send, Loader, Hash, User, FileText, Plus, Maximize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/api';
import chatService from '../services/chatService';
import i18n from '../i18n/config';

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };
const currentLocale = () => BCP47_LOCALES[i18n.language] || 'fr-FR';

const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const diffDays = Math.floor((Date.now() - d) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return i18n.t('Hier');
  return d.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' });
};

const avatarColor = (str = '') => {
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

const Avatar = ({ fn = '', ln = '', size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: avatarColor(`${fn}${ln}`), color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, userSelect: 'none',
  }}>
    {(fn?.[0] || '')}{(ln?.[0] || '')}
  </div>
);

const convName = (conv) => {
  if (!conv) return '';
  if (conv.type === 'direct') {
    return conv.other_first_name ? `${conv.other_first_name} ${conv.other_last_name}` : (conv.name || i18n.t('Message direct'));
  }
  return conv.name || i18n.t('Sans nom');
};

const convIcon = (conv) => {
  if (conv.type === 'direct') return <User size={12} />;
  if (conv.type === 'document') return <FileText size={12} />;
  return <Hash size={12} />;
};

const iconGhostBtn = {
  width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent',
  color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const Centered = ({ children, small }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: small ? 12 : 32, color: 'var(--fg-muted)', textAlign: 'center' }}>
    {children}
  </div>
);

export default function GlobalChatBubble({ unreadCount = 0, onUnreadChange }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = getSocket();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'thread' | 'new'
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const panelRef = useRef(null);
  const bottomRef = useRef(null);

  const hideOnThisPage = location.pathname.startsWith('/chat');

  // Fermeture au clic extérieur / Échap — pour rester discret
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (_) {}
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (open && view === 'list') loadConversations();
  }, [open, view, loadConversations]);

  const openThread = useCallback(async (conv) => {
    setView('thread');
    setActiveConv(conv);
    setMessages([]);
    setLoadingThread(true);
    try {
      const msgs = await chatService.getMessages(conv.id);
      setMessages(msgs);
      await chatService.markAsRead(conv.id);
      onUnreadChange?.();
      if (socket) socket.emit('chat:join', conv.id);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 60);
    } catch (_) {}
    setLoadingThread(false);
  }, [socket, onUnreadChange]);

  const backToList = () => {
    if (activeConv && socket) socket.emit('chat:leave', activeConv.id);
    setView('list');
    setActiveConv(null);
    setMessages([]);
    loadConversations();
  };

  useEffect(() => {
    if (!socket || !activeConv || view !== 'thread') return;
    const handleMsg = (msg) => {
      const cid = msg.conversationId || msg.conversation_id;
      if (cid !== activeConv.id) return;
      setMessages(prev => [...prev, msg]);
      chatService.markAsRead(activeConv.id);
      onUnreadChange?.();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    socket.on('chat:message', handleMsg);
    return () => socket.off('chat:message', handleMsg);
  }, [socket, activeConv, view, onUnreadChange]);

  // Rafraîchit discrètement la liste si un message arrive pendant qu'elle est affichée
  useEffect(() => {
    if (!socket || !open || view !== 'list') return;
    const handleMsg = () => loadConversations();
    socket.on('chat:message', handleMsg);
    return () => socket.off('chat:message', handleMsg);
  }, [socket, open, view, loadConversations]);

  const handleSend = async () => {
    if (!text.trim() || sending || !activeConv) return;
    const content = text.trim();
    setSending(true);
    setText('');
    try {
      await chatService.sendMessage(activeConv.id, { content });
    } catch (_) {}
    setSending(false);
  };

  // Recherche d'utilisateurs pour démarrer une nouvelle discussion
  useEffect(() => {
    if (view !== 'new') return;
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await chatService.searchUsers(search.trim());
        setSearchResults(results.filter(u => u.id !== user?.id));
      } catch (_) {}
      setSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, view, user?.id]);

  const startDirect = async (targetUser) => {
    try {
      const res = await chatService.createConversation({ type: 'direct', memberIds: [targetUser.id] });
      const convId = res.data?.id;
      if (!convId) return;
      setSearch('');
      setSearchResults([]);
      await openThread({
        id: convId,
        type: 'direct',
        other_first_name: targetUser.firstName || targetUser.first_name,
        other_last_name: targetUser.lastName || targetUser.last_name,
      });
    } catch (_) {}
  };

  const toggleOpen = () => {
    setOpen(v => {
      const next = !v;
      if (!next) {
        if (activeConv && socket) socket.emit('chat:leave', activeConv.id);
        setView('list');
        setActiveConv(null);
      }
      return next;
    });
  };

  if (hideOnThisPage) return null;

  return (
    <div className="hidden lg:block" ref={panelRef}>
      {/* Bouton flottant discret */}
      <button
        onClick={toggleOpen}
        title={open ? t('Fermer') : t('Discussion')}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 900,
          width: 44, height: 44, borderRadius: '50%',
          border: '1px solid var(--border)',
          background: open ? 'var(--fg)' : (unreadCount > 0 ? 'var(--brand)' : 'var(--surface)'),
          color: open ? '#fff' : (unreadCount > 0 ? '#fff' : 'var(--fg-muted)'),
          boxShadow: '0 2px 10px rgba(15,27,45,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
        }}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        {!open && unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16,
            borderRadius: 8, background: '#ef4444', color: '#fff',
            fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: '2px solid var(--surface)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau compact */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 72, right: 20, zIndex: 900,
          width: 320, height: 420, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(15,27,45,0.2)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'bubblePanelIn 0.15s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 12px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            {view !== 'list' ? (
              <button onClick={view === 'thread' ? backToList : () => setView('list')} style={iconGhostBtn}>
                <ArrowLeft size={15} />
              </button>
            ) : (
              <MessageCircle size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view === 'list' && t('Discussions')}
              {view === 'new' && t('Nouvelle discussion')}
              {view === 'thread' && convName(activeConv)}
            </div>
            {view === 'list' && (
              <button onClick={() => setView('new')} title={t('Nouvelle discussion')} style={iconGhostBtn}>
                <Plus size={15} />
              </button>
            )}
            <button
              onClick={() => { setOpen(false); navigate('/chat'); }}
              title={t('Ouvrir en plein écran')}
              style={iconGhostBtn}
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Contenu */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {view === 'list' && (
              loadingList ? (
                <Centered><Loader size={18} /></Centered>
              ) : conversations.length === 0 ? (
                <Centered>
                  <MessageCircle size={26} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 12.5 }}>{t('Aucune discussion')}</div>
                  <button onClick={() => setView('new')} style={{ marginTop: 8, fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {t('Démarrer une discussion')}
                  </button>
                </Centered>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => openThread(conv)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {conv.type === 'direct'
                      ? <Avatar fn={conv.other_first_name} ln={conv.other_last_name} size={30} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', flexShrink: 0 }}>{convIcon(conv)}</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: conv.unread_count > 0 ? 700 : 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {convName(conv)}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--fg-muted)', flexShrink: 0 }}>{fmtTime(conv.last_at)}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_deleted ? t('[Message supprimé]') : (conv.last_content || t('Aucun message'))}
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span style={{ minWidth: 16, height: 16, borderRadius: 8, background: 'var(--brand)', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                ))
              )
            )}

            {view === 'new' && (
              <div style={{ padding: 10 }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('Rechercher un utilisateur…')}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '7px 8px 7px 28px',
                      borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)',
                      color: 'var(--fg)', fontSize: 12.5, outline: 'none',
                    }}
                  />
                </div>
                {searching && <Centered small><Loader size={14} /></Centered>}
                {!searching && search.trim() && searchResults.length === 0 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)', padding: 12 }}>{t('Aucun utilisateur trouvé')}</div>
                )}
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => startDirect(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 7, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar fn={u.firstName || u.first_name} ln={u.lastName || u.last_name} size={28} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{u.firstName || u.first_name} {u.lastName || u.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{u.username}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <button
                    onClick={() => { setOpen(false); navigate('/chat'); }}
                    style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {t('Créer un groupe (page complète)')}
                  </button>
                </div>
              </div>
            )}

            {view === 'thread' && (
              <div style={{ padding: '10px 12px' }}>
                {loadingThread ? (
                  <Centered><Loader size={18} /></Centered>
                ) : messages.length === 0 ? (
                  <Centered>
                    <div style={{ fontSize: 12.5 }}>{t('Aucun message')}</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>{t('Démarrez la discussion')}</div>
                  </Centered>
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
                            <Avatar fn={fn} ln={ln} size={22} />
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg)' }}>{isMine ? t('Vous') : `${fn} ${ln}`}</span>
                            <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{fmtTime(msg.created_at || msg.createdAt)}</span>
                          </div>
                        )}
                        <div style={{
                          marginLeft: 29, fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                          fontStyle: msg.isDeleted ? 'italic' : 'normal',
                          color: msg.isDeleted ? 'var(--fg-muted)' : 'var(--fg)',
                        }}>
                          {msg.isDeleted ? t('[Message supprimé]') : msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input (thread uniquement) */}
          {view === 'thread' && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t('Écrire un message…')}
                  rows={1}
                  style={{
                    flex: 1, padding: '7px 9px', borderRadius: 7, fontFamily: 'inherit',
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                    color: 'var(--fg)', fontSize: 12.5, resize: 'none', outline: 'none',
                    maxHeight: 80, overflowY: 'auto',
                  }}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  style={{
                    width: 32, height: 32, borderRadius: 7, border: 'none',
                    background: text.trim() ? 'var(--brand)' : 'var(--border)',
                    color: text.trim() ? '#fff' : 'var(--fg-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0,
                  }}
                >
                  {sending ? <Loader size={13} /> : <Send size={13} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bubblePanelIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
