// frontend/src/components/chat/ChatMessages.jsx
// Bulles de message, zone de saisie et petits outils de la discussion, partagés
// par la page Discussion (pages/ChatPage.jsx) et le panneau de discussion d'un
// document (components/DocumentDiscussion.jsx).
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User, Hash, Send, X, Trash2, Edit2, FileText, Loader, Paperclip, Copy,
} from 'lucide-react';
import { getSocket } from '../../services/api';
import chatService from '../../services/chatService';
import i18n from '../../i18n/config';
import ChatAttachment, { fileIcon, formatSize } from './ChatAttachment';
import GedDocumentPicker from '../GedDocumentPicker';

// Types acceptés par le serveur (utils/chatAttachments.js) : refus immédiat sinon
export const CHAT_FILE_TYPES = /\.(pdf|docx?|xlsx?|xlsm|pptx?|odt|ods|odp|rtf|txt|csv|jpe?g|png|gif|webp|heic|zip)$/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BCP47_LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', ar: 'ar-SA' };
export const currentLocale = () => BCP47_LOCALES[i18n.language] || 'fr-FR';

export const fmt = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return i18n.t('Hier');
  if (diffDays < 7)  return d.toLocaleDateString(currentLocale(), { weekday: 'short' });
  return d.toLocaleDateString(currentLocale(), { day: '2-digit', month: 'short' });
};

export const fmtFull = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });
};

export const fmtDay = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86_400_000);
  if (diffDays === 0) return i18n.t("Aujourd'hui");
  if (diffDays === 1) return i18n.t('Hier');
  return d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
};

export const initials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase() || '?';

export const convName = (conv, user) => {
  if (conv.type === 'direct') {
    return conv.other_first_name
      ? `${conv.other_first_name} ${conv.other_last_name}`
      : conv.name || i18n.t('Message direct');
  }
  return conv.name || i18n.t('Sans nom');
};

export const convIcon = (conv) => {
  if (conv.type === 'direct') return <User size={13} />;
  if (conv.type === 'document') return <FileText size={13} />;
  return <Hash size={13} />;
};

export const avatarColor = (str = '') => {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
  let hash = 0;
  for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── @mention highlighting ───────────────────────────────────────────────────

export const renderMentions = (content) => {
  if (!content) return null;
  // Identifiants avec tirets ou points (F-YANKEU) : même règle que le serveur
  const parts = content.split(/(@[A-Za-z0-9_.-]*[A-Za-z0-9_])/g);
  return parts.map((part, i) =>
    /^@[A-Za-z0-9_.-]*[A-Za-z0-9_]$/.test(part)
      ? <span key={i} style={{
          color: 'var(--brand)', fontWeight: 700,
          background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
          borderRadius: 3, padding: '0 2px',
        }}>{part}</span>
      : part
  );
};

// ─── Emojis rapides ──────────────────────────────────────────────────────────

export const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','😡','🎉','👏'];

// ─── Composant Avatar ─────────────────────────────────────────────────────────

export const Avatar = ({ firstName, lastName, size = 32, isOnline = false }) => {
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

// Bulle façon messagerie (WhatsApp / Telegram) : mes messages à droite en
// couleur, ceux des autres à gauche ; heure dans la bulle ; nom et avatar
// seulement dans les groupes. Actions (réagir, modifier, supprimer) au survol
// sur ordinateur, par appui long sur téléphone.
export const MessageBubble = ({ msg, isMine, showHeader, isGroup, onEdit, onDelete, onReact, onlineUsers = new Set(), currentUserId }) => {
  const { t } = useTranslation();
  const [actionsOpen, setActionsOpen] = useState(false); // appui long (écran tactile)
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef(null);
  const rowRef = useRef(null);
  const pressTimer = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Appui long ouvert : un toucher ailleurs le referme
  useEffect(() => {
    if (!actionsOpen) return;
    const close = (e) => { if (!rowRef.current?.contains(e.target)) { setActionsOpen(false); setShowPicker(false); } };
    document.addEventListener('touchstart', close);
    document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('touchstart', close); document.removeEventListener('mousedown', close); };
  }, [actionsOpen]);

  const submitEdit = () => {
    if (editVal.trim() && editVal.trim() !== msg.content) onEdit(msg.id, editVal.trim());
    setEditing(false);
  };

  // Message automatique (validation, signature, transmission…) : pastille centrée
  if (msg.is_system || msg.isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 16px 0' }}>
        <div style={{ maxWidth: 'min(90%, 520px)', padding: '5px 12px', borderRadius: 10, background: 'var(--chat-system-bg)', color: 'var(--fg)', fontSize: 12.5, lineHeight: 1.45, textAlign: 'center', boxShadow: 'var(--chat-bubble-shadow)', wordBreak: 'break-word' }}>
          {msg.content}
          <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--chat-meta)', whiteSpace: 'nowrap' }}>{fmtFull(msg.created_at || msg.createdAt)}</span>
        </div>
      </div>
    );
  }

  const deleted = msg.isDeleted || msg.is_deleted;
  const authorFirst = msg.author_first_name || msg.authorFirstName;
  const authorLast = msg.author_last_name || msg.authorLastName;
  const showAvatar = isGroup && !isMine;
  const time = fmtFull(msg.created_at || msg.createdAt);
  const edited = msg.editedAt || msg.edited_at;
  // Survol : géré en CSS (.chat-row:hover .chat-actions), jamais bloqué
  const actionsVisible = !editing && !deleted;

  // Coin « queue » sur la première bulle d'une série
  const radius = 12;
  const bubbleRadius = showHeader
    ? (isMine ? `${radius}px 4px ${radius}px ${radius}px` : `4px ${radius}px ${radius}px ${radius}px`)
    : `${radius}px`;

  const meta = (
    <span style={{ float: 'right', marginLeft: 10, marginTop: 6, marginBottom: -3, fontSize: 11, lineHeight: '14px', color: 'var(--chat-meta)', whiteSpace: 'nowrap', userSelect: 'none' }}>
      {edited && !deleted && <>{t('modifié')} · </>}{time}
    </span>
  );

  return (
    <div
      ref={rowRef}
      className={`chat-row${actionsOpen || showPicker ? ' is-open' : ''}`}
      onMouseLeave={() => setShowPicker(false)}
      onTouchStart={() => { pressTimer.current = setTimeout(() => setActionsOpen(true), 450); }}
      onTouchEnd={() => clearTimeout(pressTimer.current)}
      onTouchMove={() => clearTimeout(pressTimer.current)}
      onContextMenu={e => { if (window.matchMedia('(pointer: coarse)').matches) e.preventDefault(); }}
      style={{
        position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 6,
        flexDirection: isMine ? 'row-reverse' : 'row',
        padding: `${showHeader ? 8 : 2}px 12px 0`,
      }}
    >
      {showAvatar && (
        <div style={{ width: 30, flexShrink: 0, alignSelf: 'flex-start' }}>
          {showHeader && <Avatar firstName={authorFirst} lastName={authorLast} size={30} isOnline={onlineUsers.has(msg.author_id || msg.authorId)} />}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: 'min(78%, 560px)', minWidth: 0 }}>
        <div style={{
          position: 'relative', padding: '6px 9px 5px', borderRadius: bubbleRadius,
          background: isMine ? 'var(--chat-mine-bg)' : 'var(--chat-other-bg)',
          color: 'var(--fg)', boxShadow: 'var(--chat-bubble-shadow)',
          minWidth: 60, maxWidth: '100%', boxSizing: 'border-box',
          outline: actionsOpen ? '2px solid var(--brand)' : 'none',
        }}>
          {isGroup && !isMine && showHeader && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: avatarColor(`${authorFirst}${authorLast}`), marginBottom: 2 }}>
              {authorFirst} {authorLast}
            </div>
          )}

          {deleted ? (
            <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--fg-muted)', lineHeight: 1.45 }}>
              🚫 {t('Message supprimé')}{meta}
            </div>
          ) : editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 'min(320px, 70vw)' }}>
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
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                <button onClick={submitEdit} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
                  {t('Enregistrer')}
                </button>
                <button onClick={() => setEditing(false)} style={{ background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
                  {t('Annuler')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <ChatAttachment msg={msg} />
              {msg.content ? (
                <div style={{ fontSize: 14.5, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap', marginTop: (msg.has_file || msg.hasFile || msg.attachment_document_id || msg.attachmentDocumentId) ? 4 : 0 }}>
                  {renderMentions(msg.content)}{meta}
                </div>
              ) : (
                <div style={{ overflow: 'hidden' }}>{meta}</div>
              )}
            </>
          )}
        </div>

        {/* Réactions, accrochées sous la bulle */}
        {!deleted && msg.reactions && msg.reactions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -4, padding: '0 6px', position: 'relative', zIndex: 1 }}>
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
                    padding: '1px 7px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
                    border: `1px solid ${reacted ? 'var(--brand)' : 'var(--border)'}`,
                    background: reacted ? 'color-mix(in srgb, var(--brand) 14%, var(--surface))' : 'var(--surface)',
                    color: 'var(--fg)', boxShadow: 'var(--chat-bubble-shadow)',
                  }}
                >
                  {r.emoji} {r.users?.length > 1 && <span style={{ fontSize: 11, fontWeight: 600 }}>{r.users.length}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions à côté de la bulle */}
      {actionsVisible && (
        <div className="chat-actions" style={{ gap: 4, alignSelf: 'center', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <ActionBtn
              icon={<span style={{ fontSize: 13 }}>😊</span>}
              title={t('Réagir')}
              onClick={() => setShowPicker(v => !v)}
            />
            {showPicker && (
              <div
                style={{
                  position: 'absolute', bottom: 30, [isMine ? 'right' : 'left']: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '4px 6px', display: 'flex', gap: 2,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 50, whiteSpace: 'nowrap',
                }}
              >
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => { onReact && onReact(msg.id, e); setShowPicker(false); setActionsOpen(false); }}
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
          {msg.content && (
            <ActionBtn icon={<Copy size={13} />} title={t('Copier le texte')}
              onClick={() => { navigator.clipboard?.writeText(msg.content).catch(() => {}); setActionsOpen(false); }} />
          )}
          {isMine && (
            <>
              <ActionBtn icon={<Edit2 size={13} />} title={t('Modifier')} onClick={() => { setEditVal(msg.content); setEditing(true); setShowPicker(false); setActionsOpen(false); }} />
              <ActionBtn icon={<Trash2 size={13} />} title={t('Supprimer')} onClick={() => { setActionsOpen(false); onDelete(msg.id); }} danger />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const ActionBtn = ({ icon, title, onClick, danger }) => (
  <button
    title={title}
    aria-label={title}
    onClick={onClick}
    style={{
      padding: '5px 7px', border: '1px solid var(--border)', borderRadius: 999,
      background: 'var(--surface)', color: danger ? 'var(--danger)' : 'var(--fg-muted)',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
    }}
  >
    {icon}
  </button>
);

// ─── Zone de saisie ───────────────────────────────────────────────────────────

// mentionSearch(q) : recherche des personnes à mentionner sur le serveur
// (discussion d'un document : tout collègue, qui recevra le document s'il ne
// peut pas le lire). Sans elle, la liste @ propose les membres.
export const MessageInput = ({ onSend, convId, disabled, members = [], droppedFiles, mentionSearch }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Pièces jointes en attente d'envoi : fichiers de l'appareil ou documents de la GED
  const [pending, setPending] = useState([]);
  const [progress, setProgress] = useState(null);
  const [attachError, setAttachError] = useState(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [showGedPicker, setShowGedPicker] = useState(false);
  const fileInputRef = useRef(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  // Personnes choisies dans la liste @ (identifiant en minuscules → id)
  const pickedMentions = useRef(new Map());
  const mentionTimer = useRef(null);
  const [notice, setNotice] = useState(null);
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

  const addFiles = (files) => {
    const list = [...(files || [])];
    if (!list.length) return;
    const refused = list.filter(f => !CHAT_FILE_TYPES.test(f.name || ''));
    setAttachError(refused.length
      ? t('Type de fichier non accepté : {{names}}. PDF, Word, Excel, PowerPoint, OpenOffice, texte, CSV, images ou ZIP.', { names: refused.map(f => f.name).join(', ') })
      : null);
    const ok = list.filter(f => CHAT_FILE_TYPES.test(f.name || ''));
    setPending(p => [...p, ...ok.map(file => ({ key: `${file.name}-${file.size}-${Math.random()}`, kind: 'file', file }))]);
    setTimeout(() => textareaRef.current?.focus(), 10);
  };

  // Fichiers déposés sur le fil de messages (glisser-déposer)
  useEffect(() => { if (droppedFiles?.files?.length) addFiles(droppedFiles.files); }, [droppedFiles]);

  const handlePaste = (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    // Capture d'écran collée : nom lisible
    addFiles(files.map(f => (f.name && f.name !== 'image.png') ? f
      : new window.File([f], `capture-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`, { type: f.type })));
  };

  const getMentionMatch = (val) => val.match(/(?:^|\s)@([A-Za-z0-9_.-]*)$/);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    emitTyping();
    const match = getMentionMatch(val);
    if (match && mentionSearch) {
      const q = match[1];
      clearTimeout(mentionTimer.current);
      mentionTimer.current = setTimeout(async () => {
        const list = await mentionSearch(q).catch(() => []);
        setMentionSuggestions(list.slice(0, 8));
        setMentionIdx(0);
      }, 200);
    } else if (match) {
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
      clearTimeout(mentionTimer.current);
      setMentionSuggestions([]);
    }
  };

  // Ids des personnes choisies dont l'@identifiant est resté dans le texte
  const mentionIdsIn = (content) => {
    const present = new Set([...content.matchAll(/@([A-Za-z0-9_.-]*[A-Za-z0-9_])/g)].map(m => m[1].toLowerCase()));
    return [...pickedMentions.current].filter(([handle]) => present.has(handle)).map(([, id]) => id);
  };

  const showAdded = (added) => {
    if (!added?.length) return;
    const fresh = added.filter(a => a.joined || a.transmitted);
    if (!fresh.length) return;
    setNotice(fresh.map(a => a.transmitted
      ? t('{{name}} a été ajouté(e) à la discussion et a reçu le document.', { name: a.name })
      : t('{{name}} a été ajouté(e) à la discussion.', { name: a.name })).join(' '));
    setTimeout(() => setNotice(null), 8000);
  };

  const selectMention = (m) => {
    const handle = m.username || `${m.first_name}.${m.last_name}`.toLowerCase();
    const id = m.user_id || m.id;
    if (id) pickedMentions.current.set(handle.toLowerCase(), id);
    const newText = text.replace(/@[A-Za-z0-9_.-]*$/, `@${handle} `);
    setText(newText);
    setMentionSuggestions([]);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; ta.focus(); }
    }, 0);
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !pending.length) || sending) return;
    setSending(true);
    setText('');
    setMentionSuggestions([]);
    setAttachError(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      const mentionUserIds = mentionIdsIn(content);
      if (!pending.length) {
        const sent = await onSend({ content, ...(mentionUserIds.length ? { mentionUserIds } : {}) });
        showAdded(sent?.added);
        pickedMentions.current.clear();
        return;
      }
      // Une pièce jointe par message ; le texte accompagne la première
      const queue = [...pending];
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const caption = i === 0 ? content : '';
        try {
          const ids = i === 0 ? mentionUserIds : [];
          let sent;
          if (item.kind === 'doc') sent = await chatService.shareDocument(convId, item.doc.id, caption, ids);
          else {
            setProgress({ name: item.file.name, value: 0 });
            sent = await chatService.uploadAttachment(convId, item.file, caption, (v) => setProgress({ name: item.file.name, value: v }), ids);
          }
          if (i === 0) { showAdded(sent?.added); pickedMentions.current.clear(); }
          setPending(p => p.filter(x => x.key !== item.key));
        } catch (err) {
          setAttachError(`${item.kind === 'doc' ? item.doc.title : item.file.name} : ${t(err.message)}`);
          if (i === 0 && content) setText(content);
          break;
        }
      }
    } finally {
      setProgress(null);
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

      {notice && (
        <div role="status" style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--success-soft, var(--surface-2))', color: 'var(--success, var(--fg))' }}>
          ✓ {notice}
        </div>
      )}

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
              <span style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name} {m.last_name}</span>
              {m.username && <span style={{ color: 'var(--fg-muted)', fontSize: 12, flexShrink: 0 }}>@{m.username}</span>}
              {m.has_access === false ? (
                <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: 'var(--warning-soft, var(--surface-2))', color: 'var(--warning, var(--fg-muted))' }}>
                  {t('recevra le document')}
                </span>
              ) : m.is_member === false ? (
                <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, color: 'var(--fg-muted)' }}>{t('sera ajouté(e)')}</span>
              ) : null}
            </div>
          ))}
          <div style={{ padding: '3px 12px 6px', fontSize: 10, color: 'var(--fg-muted)' }}>
            {t('↑↓ naviguer · Tab/Entrée pour insérer · Échap pour fermer')}
          </div>
        </div>
      )}

      {/* Pièces jointes prêtes à partir */}
      {(pending.length > 0 || attachError || progress) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {pending.map(item => {
            const label = item.kind === 'doc' ? item.doc.title : item.file.name;
            const Icon = item.kind === 'doc' ? FileText : fileIcon(label);
            const uploading = progress && item.kind === 'file' && progress.name === item.file.name;
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 260, padding: '4px 6px 4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 12, color: 'var(--fg)' }}>
                <Icon size={14} style={{ color: item.kind === 'doc' ? 'var(--brand)' : 'var(--fg-muted)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
                <span style={{ color: 'var(--fg-muted)', flexShrink: 0 }}>
                  {uploading ? `${Math.round(progress.value * 100)} %` : item.kind === 'doc' ? t('GED') : formatSize(item.file.size)}
                </span>
                {!sending && (
                  <button type="button" onClick={() => setPending(p => p.filter(x => x.key !== item.key))} aria-label={t('Retirer')}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', padding: 2, display: 'flex' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
          {attachError && <div style={{ width: '100%', fontSize: 12, color: 'var(--danger)' }}>{attachError}</div>}
        </div>
      )}

      {/* Menu du trombone */}
      {attachMenu && (
        <>
          <div onClick={() => setAttachMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 190 }} />
          <div style={{ position: 'absolute', bottom: '100%', left: 16, marginBottom: 4, zIndex: 200, minWidth: 230, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {[
              [Paperclip, t('Fichier de l\'ordinateur ou du téléphone'), () => fileInputRef.current?.click()],
              [FileText, t('Document de la GED'), () => setShowGedPicker(true)],
            ].map(([Icon, label, action]) => (
              <button key={label} type="button" onClick={() => { setAttachMenu(false); action(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Icon size={15} style={{ color: 'var(--brand)' }} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
      <input ref={fileInputRef} type="file" multiple hidden
        accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.heic,.zip,image/*"
        onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
      {showGedPicker && (
        <GedDocumentPicker pdfOnly={false}
          title={t('Partager un document de la GED')}
          subtitle={t('Il ne s\'ouvrira que pour les membres qui ont déjà le droit de le lire.')}
          pickLabel={t('Joindre ce document')}
          onClose={() => setShowGedPicker(false)}
          onPick={(doc) => {
            setShowGedPicker(false);
            setPending(p => p.some(x => x.kind === 'doc' && x.doc.id === doc.id) ? p : [...p, { key: `doc-${doc.id}`, kind: 'doc', doc }]);
            setTimeout(() => textareaRef.current?.focus(), 10);
          }} />
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 22, padding: '6px 6px 6px 10px',
      }}>
        <button type="button" onClick={() => setAttachMenu(o => !o)} disabled={disabled || sending}
          title={t('Joindre un fichier ou un document de la GED')} aria-label={t('Joindre un fichier ou un document de la GED')}
          style={{ padding: '9px 4px', border: 'none', background: 'transparent', color: attachMenu ? 'var(--brand)' : 'var(--fg-muted)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <Paperclip size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          disabled={disabled || sending}
          placeholder={t('Écrire un message…')}
          rows={1}
          style={{
            flex: 1, border: 'none', background: 'transparent', color: 'var(--fg)',
            fontSize: 15, resize: 'none', outline: 'none', fontFamily: 'inherit', padding: '7px 0',
            maxHeight: 160, overflowY: 'auto', lineHeight: 1.5,
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
          }}
        />
        <button
          onClick={send}
          disabled={(!text.trim() && !pending.length) || sending}
          aria-label={t('Envoyer')}
          style={{
            width: 36, height: 36, justifyContent: 'center', borderRadius: '50%', border: 'none',
            background: text.trim() || pending.length ? 'var(--brand)' : 'var(--border)',
            color: text.trim() || pending.length ? '#fff' : 'var(--fg-muted)',
            cursor: text.trim() || pending.length ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          {sending ? <Loader size={14} className="spin" /> : <Send size={14} />}
        </button>
      </div>
      <div className="chat-hint" style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4, paddingLeft: 12 }}>
        {t('@ pour mentionner · Maj+Entrée pour retour à la ligne · 📎 ou glisser un fichier pour le joindre')}
      </div>
    </div>
  );
};

