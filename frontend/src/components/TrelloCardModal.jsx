// frontend/src/components/TrelloCardModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, AlignLeft, CheckSquare, Clock, Tag, User,
  Paperclip, Trash2, Activity, Check, Plus, ArrowRight,
  Bold, Italic, List, ListOrdered, AtSign, Smile, Eye,
  MessageSquare, Bell, Pin, StickyNote, Edit2,
  ChevronLeft, ChevronRight, UserPlus
} from 'lucide-react';
import { trelloAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { timeAgo } from '../utils/dateUtils';

// ── Style helpers ──────────────────────────────────────────────────────────────
const popoverBase = {
  position: 'fixed', zIndex: 12000, background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
  boxShadow: 'var(--shadow-3)', padding: 12,
};
const inputCls = {
  width: '100%', padding: '7px 10px', boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-2)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none',
};
const selectCls = { ...inputCls, height: 34 };
const toolbarBtn = {
  padding: '4px', background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)', display: 'flex',
};
const actionBtn = (bg = 'var(--brand)', color = '#fff', disabled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 32, padding: '0 12px', borderRadius: 'var(--radius-2)',
  border: 'none', background: bg, color,
  fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
const ghostBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 30, padding: '0 10px', borderRadius: 'var(--radius-2)',
  border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)',
  fontSize: 12, cursor: 'pointer',
};

// ── ReactionPicker ─────────────────────────────────────────────────────────────
const ReactionPicker = ({ onSelectEmoji, onClose }) => {
  const reactions = [
    { id: 'happy', icon: '😄' }, { id: 'thumb', icon: '👍' },
    { id: 'heart', icon: '❤️' }, { id: 'tada', icon: '🎉' },
    { id: 'cry', icon: '😢' }, { id: 'rofl', icon: '🤣' },
  ];
  return (
    <div style={{ ...popoverBase, width: 240, position: 'absolute', top: '100%', left: 0, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Ajouter une réaction</span>
        <button onClick={onClose} style={toolbarBtn}><X size={13} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 22, cursor: 'pointer' }}>
        {reactions.map(e => (
          <span key={e.id} onClick={() => onSelectEmoji(e.icon)}
            style={{ padding: 4, borderRadius: 'var(--radius-2)' }}
            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
          >{e.icon}</span>
        ))}
      </div>
    </div>
  );
};

// ── CommentEditor ──────────────────────────────────────────────────────────────
const CommentEditor = ({ comment, setComment, handleSaveComment, handleCancelEdit, showDetails, isEditing, commentId, isNewComment, handleInsertEmoji }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    if ((isEditing || isNewComment) && inputRef.current) {
      inputRef.current.focus();
      if (isEditing) inputRef.current.setSelectionRange(comment.length, comment.length);
    }
  }, [isEditing, isNewComment]);

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>F</div>
      <div style={{ flex: 1 }}>
        {isEditing && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', marginBottom: 4 }}>Franck YANKEU</div>}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
          {showDetails && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', padding: '0 4px' }}>Aa</span>
              {[Bold, Italic, List, ListOrdered].map((Icon, i) => (
                <button key={i} style={toolbarBtn}><Icon size={14} /></button>
              ))}
              <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
              {[Plus, Paperclip, AtSign, Smile, Eye].map((Icon, i) => (
                <button key={i} style={toolbarBtn}><Icon size={14} /></button>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Écrivez un commentaire…"
            style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontSize: 13, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <button onClick={() => handleSaveComment(commentId, comment)} disabled={!comment.trim()} style={actionBtn('var(--brand)', '#fff', !comment.trim())}>
            Enregistrer
          </button>
          {isEditing && (
            <button onClick={handleCancelEdit} style={ghostBtn}>Annuler</button>
          )}
          {isNewComment && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {[Smile, Paperclip, AtSign].map((Icon, i) => (
                <button key={i} style={toolbarBtn}><Icon size={14} /></button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── CommentList ────────────────────────────────────────────────────────────────
const CommentList = ({ activities, setEditingComment, setDeletingCommentId, toggleEmojiPicker }) => {
  if (!activities) return null;
  const sortedComments = activities.filter(item => item.id !== 'initial-activity' && item.text !== undefined);
  const initialActivity = { id: 'initial-activity', type: 'card_creation', authorName: 'Aurele Franck YANKEU', createdAt: '2025-12-05T13:09:00Z', text: "a ajouté cette carte à Aujourd'hui" };
  const combined = [...sortedComments, initialActivity].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {combined.map(item => (
        <div key={item.id} style={{ display: 'flex', gap: 10 }}>
          <img src="https://i.pravatar.cc/150?img=1" alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg)' }}>{item.authorName}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{item.type === 'card_creation' ? '5 déc. 2025 à 13:09' : (timeAgo(item.createdAt) || 'il y a quelques instants')}</span>
            </div>
            {item.type !== 'card_creation' ? (
              <div style={{ position: 'relative' }}>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: 'var(--radius-3)', fontSize: 13, color: 'var(--fg)' }}>
                  {item.text || 'test'}
                </div>
                {item.reactions?.length > 0 && (
                  <div style={{ position: 'absolute', bottom: -12, left: 4, display: 'flex', gap: 4 }}>
                    <div onClick={() => toggleEmojiPicker(item.id)} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 6px', fontSize: 11, cursor: 'pointer', gap: 3 }}>
                      <span>😄</span><span style={{ fontWeight: 600, color: 'var(--fg-muted)' }}>1</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: item.reactions?.length > 0 ? 16 : 4 }}>
                  <button onClick={() => toggleEmojiPicker(item.id)} style={{ ...toolbarBtn, fontSize: 11, color: 'var(--fg-subtle)' }}><Smile size={13} /></button>
                  <button onClick={() => setEditingComment(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--fg-subtle)' }}>Modifier</button>
                  <span style={{ color: 'var(--border-strong)', fontSize: 11 }}>•</span>
                  <button onClick={() => setDeletingCommentId(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--fg-subtle)' }}>Supprimer</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{item.text}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── AddPopover ─────────────────────────────────────────────────────────────────
const AddPopover = ({ innerRef, position, onClose, onOpenLabels, onOpenDates, onOpenChecklist }) => {
  const items = [
    { icon: Tag,       label: 'Étiquettes',        desc: 'Organisez, répertoriez et classez par ordre de priorité', action: 'labels' },
      { icon: Clock,     label: 'Dates',              desc: "Dates de début, dates d'échéance et rappels", action: 'dates' },
    { icon: CheckSquare, label: 'Checklist',        desc: 'Ajouter des sous-tâches', action: 'checklist' },
    { icon: User,      label: 'Membres',            desc: 'Attribuer des membres' },
    { icon: Paperclip, label: 'Pièce jointe',       desc: 'Ajouter des liens, des pages, des tickets, etc.' },
    { icon: StickyNote, label: 'Champs personnalisés', desc: 'Créer vos propres champs' },
  ];
  const s = position ? { top: position.top, left: position.left } : { top: 80, left: 80 };
  return (
    <div ref={innerRef} style={{ ...popoverBase, ...s, width: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Ajouter à la carte</span>
        <button onClick={onClose} style={toolbarBtn}><X size={14} /></button>
      </div>
      {items.map(({ icon: Icon, label, desc, action }) => (
        <button key={label} onClick={() => { if (action === 'labels' && onOpenLabels) onOpenLabels(); if (action === 'dates' && onOpenDates) onOpenDates(); if (action === 'checklist' && onOpenChecklist) onOpenChecklist(); }}
          style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', textAlign: 'left' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <div style={{ marginTop: 1, color: 'var(--fg-muted)' }}><Icon size={18} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.4 }}>{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── LabelsPopover ──────────────────────────────────────────────────────────────
const LabelsPopover = ({ innerRef, position, colors = [], selected = [], onToggle, onClose }) => {
  const s = position ? { top: position.top, left: position.left } : { top: 80, left: 80 };
  return (
    <div ref={innerRef} style={{ ...popoverBase, ...s, width: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}><Tag size={16} /> Étiquettes</div>
        <button onClick={onClose} style={toolbarBtn}><X size={14} /></button>
      </div>
      <input style={{ ...inputCls, marginBottom: 10 }} placeholder="Parcourir les étiquettes…" />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 6 }}>Étiquettes</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {colors.map(c => {
          const checked = selected.some(l => l.color === c.color);
          return (
            <div key={c.color} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(c)} style={{ width: 14, height: 14 }} />
              <div style={{ height: 28, flex: 1, borderRadius: 'var(--radius-2)', background: c.hex || '#888' }} />
              <button style={toolbarBtn}><Edit2 size={13} /></button>
            </div>
          );
        })}
      </div>
      <button style={{ width: '100%', marginTop: 8, ...ghostBtn, justifyContent: 'center' }}>Créer une nouvelle étiquette</button>
    </div>
  );
};

// ── DatesPopover ───────────────────────────────────────────────────────────────
const DatesPopover = ({ innerRef, position, onClose, month, year, startDate, dueDate, dueTime, recurrence, reminder, onChangeStart, onChangeDue, onChangeTime, onChangeRecurrence, onChangeReminder, onPrevMonth, onNextMonth, onSelectDay, onSave, onClear }) => {
  const s = position ? { top: position.top, left: position.left } : { top: 80, left: 80 };
  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <div ref={innerRef} style={{ ...popoverBase, ...s, width: 300 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={onPrevMonth} style={toolbarBtn}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{monthNames[month]} {year}</span>
        <button onClick={onNextMonth} style={toolbarBtn}><ChevronRight size={16} /></button>
        <button onClick={onClose} style={{ ...toolbarBtn, marginLeft: 4 }}><X size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4 }}>
        {['lun','mar','mer','jeu','ven','sam','dim'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 12 }}>
        {days.map(d => (
          <button key={d} onClick={() => onSelectDay && onSelectDay(d)}
            style={{ padding: '6px 2px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', fontSize: 12, color: 'var(--fg)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >{d}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Date de début</label><input value={startDate} onChange={e => onChangeStart(e.target.value)} style={{ ...inputCls, marginTop: 4 }} placeholder="JJ/MM/AAAA" /></div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Date limite</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={dueDate} onChange={e => onChangeDue(e.target.value)} style={{ ...inputCls, flex: 1 }} placeholder="JJ/MM/AAAA" />
            <input value={dueTime} onChange={e => onChangeTime(e.target.value)} style={{ ...inputCls, width: 70 }} placeholder="HH:MM" />
          </div>
        </div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Récurrent</label>
          <select value={recurrence} onChange={e => onChangeRecurrence(e.target.value)} style={{ ...selectCls, marginTop: 4 }}>
            <option value="never">Jamais</option><option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire</option><option value="monthly">Mensuel</option>
          </select>
        </div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Définir un rappel</label>
          <select value={reminder} onChange={e => onChangeReminder(e.target.value)} style={{ ...selectCls, marginTop: 4 }}>
            <option value="none">Aucun</option><option value="5m">5 minutes avant</option>
            <option value="1h">1 heure avant</option><option value="1d">1 jour avant</option>
          </select>
        </div>
      </div>
      <button onClick={onSave} style={{ width: '100%', marginTop: 10, ...actionBtn('var(--brand)'), justifyContent: 'center' }}>Enregistrer</button>
      <button onClick={onClear} style={{ width: '100%', marginTop: 6, ...ghostBtn, justifyContent: 'center' }}>Effacer</button>
    </div>
  );
};

// ── ChecklistPopover ───────────────────────────────────────────────────────────
const ChecklistPopover = ({ innerRef, position, title, onChangeTitle, onSelectSuggestion, onSubmit, onClose }) => {
  const s = position ? { top: position.top, left: position.left } : { top: 80, left: 80 };
  const suggestions = ['Barre de navigation', 'Planificateur'];
  return (
    <div ref={innerRef} style={{ ...popoverBase, ...s, width: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Ajouter une checklist</span>
        <button onClick={onClose} style={toolbarBtn}><X size={14} /></button>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 6 }}>Suggestions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => onSelectSuggestion(s)}
            style={{ width: '100%', padding: '6px 10px', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-2)', fontSize: 12, color: 'var(--fg)', textAlign: 'left' }}
          >{s}</button>
        ))}
      </div>
      <div><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)' }}>Titre</label>
        <input value={title} onChange={e => onChangeTitle(e.target.value)} style={{ ...inputCls, marginTop: 4 }} placeholder="Checklist" />
      </div>
      <button onClick={onSubmit} style={{ width: '100%', marginTop: 8, ...actionBtn('var(--brand)'), justifyContent: 'center' }}>Ajouter</button>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const TrelloCardModal = ({ card, serviceType, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [currentCard, setCurrentCard]   = useState(card);
  const [description, setDescription]  = useState(card.description || '');
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment]     = useState(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [showEmojiPickerId, setShowEmojiPickerId] = useState(null);
  const [isEditingDesc, setIsEditingDesc]   = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle]                   = useState(card.title || '');
  const [showCommentSidebar, setShowCommentSidebar]             = useState(true);
  const [showCommentSidebarDetails, setShowCommentSidebarDetails] = useState(true);
  const [checklists, setChecklists]     = useState(card.checklists || []);
  const [selectedLabels, setSelectedLabels] = useState(card.labels || []);
  const [activePopover, setActivePopover]   = useState(null);
  const [calendarMonth, setCalendarMonth]   = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear]     = useState(new Date().getFullYear());
  const [startDate, setStartDate]           = useState(card?.dates?.startDate || '');
  const [dueDate, setDueDate]               = useState(card?.dates?.dueDate || '');
  const [dueTime, setDueTime]               = useState(card?.dates?.dueTime || '');
  const [recurrence, setRecurrence]         = useState(card?.dates?.recurrence || 'never');
  const [reminder, setReminder]             = useState(card?.dates?.reminder || 'none');
  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist');
  const [itemDrafts, setItemDrafts]         = useState({});
  const [deletingChecklistId, setDeletingChecklistId] = useState(null);
  const [showAssignPopoverId, setShowAssignPopoverId] = useState(null);
  const [addPopoverPos, setAddPopoverPos]       = useState(null);
  const [labelsPopoverPos, setLabelsPopoverPos] = useState(null);
  const [datesPopoverPos, setDatesPopoverPos]   = useState(null);
  const [checklistPopoverPos, setChecklistPopoverPos] = useState(null);

  const popoverRef      = useRef(null);
  const reactionPickerRef = useRef(null);
  const titleInputRef   = useRef(null);
  const addButtonRef    = useRef(null);
  const labelsButtonRef = useRef(null);
  const datesButtonRef  = useRef(null);
  const checklistButtonRef = useRef(null);

  const availableColors = [
    { color: '#61BD4F', name: 'Vert',   hex: '#61BD4F' },
    { color: '#F2D600', name: 'Jaune',  hex: '#F2D600' },
    { color: '#FF9F1A', name: 'Orange', hex: '#FF9F1A' },
    { color: '#EB5A46', name: 'Rouge',  hex: '#EB5A46' },
    { color: '#C377E0', name: 'Violet', hex: '#C377E0' },
    { color: '#0079BF', name: 'Bleu',   hex: '#0079BF' },
    { color: '#00C2E0', name: 'Ciel',   hex: '#00C2E0' },
    { color: '#51E898', name: 'Citron', hex: '#51E898' },
    { color: '#FF78CB', name: 'Rose',   hex: '#FF78CB' },
    { color: '#344563', name: 'Noir',   hex: '#344563' },
  ];

  useEffect(() => {
    if (editingComment) { setEditedCommentText(editingComment.text); setNewCommentText(''); }
    else setEditedCommentText('');
  }, [editingComment]);

  useEffect(() => {
    const handle = (e) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target)) setShowEmojiPickerId(null);
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setActivePopover(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleToggleLabel = (label) => {
    setSelectedLabels(prev => {
      const exists  = prev.some(l => l.color === label.color);
      const updated = exists ? prev.filter(l => l.color !== label.color) : [...prev, label];
      setCurrentCard(c => ({ ...c, labels: updated }));
      try { trelloAPI.updateCard(currentCard.id, { labels: updated }); onUpdate(); } catch { }
      return updated;
    });
  };

  const handleSaveDates = async () => {
    const payload = { startDate, dueDate, dueTime, recurrence, reminder };
    setCurrentCard(c => ({ ...c, dates: payload }));
    setActivePopover(null);
    try { await trelloAPI.updateCard(currentCard.id, { dates: payload }); onUpdate(); } catch { }
  };

  const handleClearDates = async () => {
    setStartDate(''); setDueDate(''); setDueTime(''); setRecurrence('never'); setReminder('none');
    setCurrentCard(c => ({ ...c, dates: {} }));
    setActivePopover(null);
    try { await trelloAPI.updateCard(currentCard.id, { dates: {} }); } catch { }
  };

  const parseDateString = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(v => parseInt(v, 10));
    return (!d || !m || !y) ? null : { d, m: m - 1, y };
  };

  const setCalendarFromDate = (str) => {
    const parsed = parseDateString(str);
    if (parsed) { setCalendarMonth(parsed.m); setCalendarYear(parsed.y); }
    else { const n = new Date(); setCalendarMonth(n.getMonth()); setCalendarYear(n.getFullYear()); }
  };

  const dueInfo = (() => {
    const parsed = parseDateString(dueDate);
    if (!parsed) return null;
    const [hh = 0, mm = 0] = (dueTime || '00:00').split(':').map(v => parseInt(v, 10));
    const dt   = new Date(parsed.y, parsed.m, parsed.d, hh || 0, mm || 0);
    const diff = dt.getTime() - Date.now();
    const isPast = diff < 0, isSoon = diff >= 0 && diff < 36 * 3600000;
    const status = isPast ? 'En retard' : isSoon ? 'Dû prochainement' : 'Dû plus tard';
    const color  = isPast ? 'var(--danger)' : isSoon ? 'var(--warning)' : 'var(--success)';
    const bg     = isPast ? 'var(--danger-soft)' : isSoon ? 'var(--warning-soft)' : 'var(--success-soft)';
    const fmt    = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} à ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    return { formatted: fmt, status, color, bg };
  })();

  const handleAddChecklist = async () => {
    const t = newChecklistTitle?.trim() || 'Checklist';
    const newCl  = { id: Date.now().toString(), title: t, items: [] };
    const updated = [...checklists, newCl];
    setChecklists(updated); setCurrentCard(c => ({ ...c, checklists: updated }));
    setNewChecklistTitle('Checklist'); setActivePopover(null);
    try { await trelloAPI.updateCard(currentCard.id, { checklists: updated }); onUpdate(); } catch { }
  };

  const handleAddChecklistItem = async (clId) => {
    const draft = itemDrafts[clId]?.trim();
    if (!draft) return;
    const updated = checklists.map(cl => cl.id === clId ? { ...cl, items: [...(cl.items || []), { id: Date.now().toString(), text: draft, done: false }] } : cl);
    setChecklists(updated); setCurrentCard(c => ({ ...c, checklists: updated }));
    setItemDrafts(d => ({ ...d, [clId]: '' }));
    try { await trelloAPI.updateCard(currentCard.id, { checklists: updated }); } catch { }
  };

  const handleToggleChecklistItem = async (clId, itemId) => {
    const updated = checklists.map(cl => cl.id !== clId ? cl : { ...cl, items: (cl.items || []).map(it => it.id === itemId ? { ...it, done: !it.done } : it) });
    setChecklists(updated); setCurrentCard(c => ({ ...c, checklists: updated }));
    try { await trelloAPI.updateCard(currentCard.id, { checklists: updated }); } catch { }
  };

  const handleDeleteChecklist = async () => {
    if (!deletingChecklistId) return;
    const updated = checklists.filter(cl => cl.id !== deletingChecklistId);
    setChecklists(updated); setCurrentCard(c => ({ ...c, checklists: updated }));
    setDeletingChecklistId(null);
    try { await trelloAPI.updateCard(currentCard.id, { checklists: updated }); } catch { }
  };

  const handleSaveDescription = async () => {
    try {
      if (description !== currentCard.description) { await trelloAPI.updateCard(currentCard.id, { description }); setCurrentCard(c => ({ ...c, description })); onUpdate(); }
      setIsEditingDesc(false);
    } catch { setDescription(currentCard.description || ''); setIsEditingDesc(false); }
  };

  const handleSaveTitle = async () => {
    try {
      if (title.trim() && title !== currentCard.title) { await trelloAPI.updateCard(currentCard.id, { title }); setCurrentCard(c => ({ ...c, title })); onUpdate(); }
      setIsEditingTitle(false);
    } catch { setTitle(currentCard.title || ''); setIsEditingTitle(false); }
  };

  const handleSaveComment = async (commentId, text) => {
    if (!text.trim()) return;
    if (commentId) {
      try {
        const res = await trelloAPI.updateComment(commentId, { content: text });
        setCurrentCard(prev => ({ ...prev, comments: prev.comments.map(c => c.id === commentId ? res.data.data : c) }));
        setEditingComment(null);
      } catch { }
    } else {
      try {
        const res = await trelloAPI.addComment(currentCard.id, { content: text });
        setCurrentCard(prev => ({ ...prev, comments: prev.comments ? [...prev.comments, res.data.data] : [res.data.data] }));
        setNewCommentText('');
      } catch { }
    }
  };

  const handleCancelEdit    = () => { setEditingComment(null); setNewCommentText(''); };
  const handleConfirmDelete = async () => {
    if (!deletingCommentId) return;
    try { await trelloAPI.deleteComment(deletingCommentId); setCurrentCard(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== deletingCommentId) })); } catch { }
    setDeletingCommentId(null);
  };
  const toggleEmojiPicker   = (id) => setShowEmojiPickerId(v => v === id ? null : id);
  const handleInsertEmoji   = (emoji) => { if (editingComment) setEditedCommentText(p => p + emoji); else setNewCommentText(p => p + emoji); setShowEmojiPickerId(null); };
  const handleSelectReaction = (emoji) => { setShowEmojiPickerId(null); };

  const barBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 'var(--radius-2)',
    border: 'none', background: 'var(--surface-2)', color: 'var(--fg-muted)',
    fontSize: 12, cursor: 'pointer',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', paddingTop: 60 }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', background: 'var(--surface)', width: '100%', maxWidth: 900, borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', margin: '0 16px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left column ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 20px 20px' }}>

            {/* Title + actions */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  {isEditingTitle ? (
                    <input
                      ref={titleInputRef}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                      style={{ width: '100%', fontSize: 20, fontWeight: 700, color: 'var(--fg)', background: 'transparent', border: 'none', borderBottom: '2px solid var(--brand)', outline: 'none', padding: '4px 0' }}
                    />
                  ) : (
                    <h2 onClick={() => setIsEditingTitle(true)}
                      style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)', cursor: 'pointer', padding: '4px 0', borderRadius: 'var(--radius-2)', margin: 0 }}>
                      {currentCard.title || 'Carte sans titre'}
                    </h2>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                    dans <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{card.listName || '…'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[Bell, Pin].map((Icon, i) => (
                    <button key={i} style={{ ...toolbarBtn, padding: 6 }}><Icon size={18} /></button>
                  ))}
                  <button onClick={onClose} style={{ ...toolbarBtn, padding: 6 }}><X size={18} /></button>
                </div>
              </div>

              {/* Action buttons row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {/* Add */}
                <div style={{ position: 'relative' }}>
                  <button ref={addButtonRef} onClick={() => { if (activePopover === 'add') { setActivePopover(null); return; } if (addButtonRef.current) { const r = addButtonRef.current.getBoundingClientRect(); setAddPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 340) }); } setActivePopover('add'); }} style={barBtn}>
                    <Plus size={14} /> Ajouter
                  </button>
                  {activePopover === 'add' && <AddPopover innerRef={popoverRef} position={addPopoverPos} onClose={() => setActivePopover(null)} onOpenLabels={() => { setActivePopover(null); if (labelsButtonRef.current) { const r = labelsButtonRef.current.getBoundingClientRect(); setLabelsPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 340) }); } setActivePopover('labels'); }} onOpenDates={() => { setActivePopover(null); setCalendarFromDate(dueDate || startDate); if (datesButtonRef.current) { const r = datesButtonRef.current.getBoundingClientRect(); setDatesPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 360) }); } setActivePopover('dates'); }} onOpenChecklist={() => { setActivePopover(null); if (checklistButtonRef.current) { const r = checklistButtonRef.current.getBoundingClientRect(); setChecklistPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 320) }); } setActivePopover('checklist'); }} />}
                </div>

                {/* Labels */}
                <div style={{ position: 'relative' }}>
                  <button ref={labelsButtonRef} onClick={() => { if (activePopover === 'labels') { setActivePopover(null); return; } if (labelsButtonRef.current) { const r = labelsButtonRef.current.getBoundingClientRect(); setLabelsPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 340) }); } setActivePopover('labels'); }} style={barBtn}>
                    <Tag size={14} /> Étiquettes
                    {currentCard.labels?.length > 0 && <span style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 600 }}>{currentCard.labels.length}</span>}
                  </button>
                  {activePopover === 'labels' && <LabelsPopover innerRef={popoverRef} position={labelsPopoverPos} colors={availableColors} selected={selectedLabels} onToggle={handleToggleLabel} onClose={() => setActivePopover(null)} />}
                </div>

                {/* Dates */}
                <div style={{ position: 'relative' }}>
                  <button ref={datesButtonRef} onClick={() => { if (activePopover === 'dates') { setActivePopover(null); return; } setCalendarFromDate(dueDate || startDate); if (datesButtonRef.current) { const r = datesButtonRef.current.getBoundingClientRect(); setDatesPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 360) }); } setActivePopover('dates'); }} style={barBtn}>
                    <Clock size={14} /> Dates
                  </button>
                  {activePopover === 'dates' && <DatesPopover innerRef={popoverRef} position={datesPopoverPos} month={calendarMonth} year={calendarYear} startDate={startDate} dueDate={dueDate} dueTime={dueTime} recurrence={recurrence} reminder={reminder} onChangeStart={setStartDate} onChangeDue={setDueDate} onChangeTime={setDueTime} onChangeRecurrence={setRecurrence} onChangeReminder={setReminder} onPrevMonth={() => { setCalendarMonth(m => m === 0 ? 11 : m - 1); setCalendarYear(y => calendarMonth === 0 ? y - 1 : y); }} onNextMonth={() => { setCalendarMonth(m => m === 11 ? 0 : m + 1); setCalendarYear(y => calendarMonth === 11 ? y + 1 : y); }} onSelectDay={day => { const mm = String(calendarMonth + 1).padStart(2, '0'); setDueDate(`${String(day).padStart(2, '0')}/${mm}/${calendarYear}`); }} onSave={handleSaveDates} onClear={handleClearDates} onClose={() => setActivePopover(null)} />}
                </div>

                {/* Checklist */}
                <div style={{ position: 'relative' }}>
                  <button ref={checklistButtonRef} onClick={() => { if (activePopover === 'checklist') { setActivePopover(null); return; } if (checklistButtonRef.current) { const r = checklistButtonRef.current.getBoundingClientRect(); setChecklistPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 320) }); } setActivePopover('checklist'); }} style={barBtn}>
                    <CheckSquare size={14} /> Checklist
                  </button>
                  {activePopover === 'checklist' && <ChecklistPopover innerRef={popoverRef} position={checklistPopoverPos} title={newChecklistTitle} onChangeTitle={setNewChecklistTitle} onSelectSuggestion={s => setNewChecklistTitle(s)} onSubmit={handleAddChecklist} onClose={() => setActivePopover(null)} />}
                </div>

                <button onClick={() => setActivePopover('members')} style={barBtn}>
                  <User size={14} /> Membres
                </button>
              </div>

              {/* Due date display */}
              {dueInfo && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Date limite</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', fontSize: 12 }}>
                    <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{dueInfo.formatted}</span>
                    <span style={{ background: dueInfo.bg, color: dueInfo.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{dueInfo.status}</span>
                    <button onClick={() => { setCalendarFromDate(dueDate || startDate); if (datesButtonRef.current) { const r = datesButtonRef.current.getBoundingClientRect(); setDatesPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 360) }); } setActivePopover('dates'); }} style={{ ...toolbarBtn, padding: 2 }}><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlignLeft size={18} color="var(--fg-muted)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Description</span>
                {!isEditingDesc && <button onClick={() => setIsEditingDesc(true)} style={{ ...ghostBtn, marginLeft: 'auto', fontSize: 12 }}>Modifier</button>}
              </div>
              {isEditingDesc ? (
                <div style={{ marginLeft: 26 }}>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} autoFocus placeholder="Ajoutez une description…"
                    style={{ width: '100%', minHeight: 100, padding: '10px 12px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={handleSaveDescription} style={actionBtn('var(--brand)')}>Sauvegarder</button>
                    <button onClick={() => { setDescription(currentCard.description || ''); setIsEditingDesc(false); }} style={ghostBtn}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setIsEditingDesc(true)} style={{ marginLeft: 26, padding: '10px 12px', borderRadius: 'var(--radius-3)', cursor: 'pointer', background: description ? 'var(--surface-2)' : 'var(--surface-3)', minHeight: 40 }}>
                  {description ? <p style={{ fontSize: 13, color: 'var(--fg)', whiteSpace: 'pre-wrap', margin: 0 }}>{description}</p> : <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>Ajouter une description…</p>}
                </div>
              )}
            </div>

            {/* Checklists */}
            {checklists?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {checklists.map(cl => {
                  const items     = cl.items || [];
                  const doneCount = items.filter(i => i.done).length;
                  const percent   = items.length ? Math.round((doneCount / items.length) * 100) : 0;
                  return (
                    <div key={cl.id} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--fg)', fontSize: 13 }}>
                          <CheckSquare size={16} color="var(--fg-muted)" /> {cl.title}
                        </div>
                        <button onClick={() => setDeletingChecklistId(cl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--danger)' }}>Supprimer</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)', width: 28, textAlign: 'right' }}>{percent}%</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percent}%`, background: 'var(--brand)', borderRadius: 999, transition: 'width .3s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                        {items.map(it => (
                          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={it.done} onChange={() => handleToggleChecklistItem(cl.id, it.id)} style={{ width: 14, height: 14 }} />
                            <div style={{ flex: 1, padding: '5px 8px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 12, color: 'var(--fg)', textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.6 : 1 }}>
                              {it.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <input value={itemDrafts[cl.id] || ''} onChange={e => setItemDrafts(d => ({ ...d, [cl.id]: e.target.value }))} placeholder="Ajouter un élément" style={{ ...inputCls, marginBottom: 6 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => handleAddChecklistItem(cl.id)} style={actionBtn('var(--brand)')}>Ajouter</button>
                          <button onClick={() => setItemDrafts(d => ({ ...d, [cl.id]: '' }))} style={ghostBtn}>Annuler</button>
                          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                            <button onClick={() => setShowAssignPopoverId(cl.id)} style={{ ...ghostBtn, gap: 4 }}><UserPlus size={12} /> Attribuer</button>
                            <button onClick={() => { setCalendarFromDate(dueDate || startDate); if (datesButtonRef.current) { const r = datesButtonRef.current.getBoundingClientRect(); setDatesPopoverPos({ top: r.bottom + 8, left: Math.min(r.left, window.innerWidth - 360) }); } setActivePopover('dates'); }} style={{ ...ghostBtn, gap: 4 }}><Clock size={12} /> Date limite</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Activity */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Activity size={18} color="var(--fg-muted)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Activité Principale</span>
              </div>
              <div style={{ marginLeft: 26, fontSize: 12, color: 'var(--fg-subtle)' }}>L'historique des actions peut être affiché ici.</div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          {showCommentSidebar && (
            <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                    <MessageSquare size={16} color="var(--fg-muted)" /> Commentaires et activité
                  </div>
                  <button onClick={() => setShowCommentSidebarDetails(v => !v)} style={{ ...ghostBtn, fontSize: 11 }}>
                    {showCommentSidebarDetails ? 'Masquer' : 'Détails'}
                  </button>
                </div>

                {editingComment && (
                  <div style={{ marginBottom: 10 }}>
                    <CommentEditor comment={editedCommentText} setComment={setEditedCommentText} handleSaveComment={handleSaveComment} handleCancelEdit={handleCancelEdit} showDetails={showCommentSidebarDetails} isEditing commentId={editingComment.id} isNewComment={false} handleInsertEmoji={handleInsertEmoji} />
                  </div>
                )}
                {!editingComment && (
                  <CommentEditor comment={newCommentText} setComment={setNewCommentText} handleSaveComment={handleSaveComment} handleCancelEdit={handleCancelEdit} showDetails={showCommentSidebarDetails} isEditing={false} commentId={null} isNewComment handleInsertEmoji={handleInsertEmoji} />
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                <CommentList activities={currentCard.comments} setEditingComment={comment => { setEditingComment(comment); setShowEmojiPickerId(null); }} setDeletingCommentId={setDeletingCommentId} toggleEmojiPicker={toggleEmojiPicker} />
              </div>

              {/* Reaction picker */}
              {showEmojiPickerId && showEmojiPickerId !== 'new' && (
                <div ref={reactionPickerRef} style={{ position: 'absolute', bottom: 20, left: 10, zIndex: 50 }}>
                  <ReactionPicker onSelectEmoji={handleSelectReaction} onClose={() => toggleEmojiPicker(null)} />
                </div>
              )}

              {/* Delete comment confirm */}
              {deletingCommentId && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
                  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 300, padding: 16, position: 'relative' }}>
                    <button onClick={() => setDeletingCommentId(null)} style={{ position: 'absolute', top: 10, right: 10, ...toolbarBtn }}><X size={14} /></button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Supprimer le commentaire ?</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>La suppression est définitive et irréversible.</div>
                    <button onClick={handleConfirmDelete} style={{ ...actionBtn('var(--danger)'), width: '100%', justifyContent: 'center' }}>Supprimer le commentaire</button>
                  </div>
                </div>
              )}

              {/* Assign popover */}
              {showAssignPopoverId && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', width: 280, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Attribuer</span>
                      <button onClick={() => setShowAssignPopoverId(null)} style={toolbarBtn}><X size={14} /></button>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', marginBottom: 4 }}>PREMIUM</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 10 }}>Ajoutez des dates et attribuez des membres aux checklists avancées.</div>
                    <input disabled placeholder="Rechercher des membres" style={{ ...inputCls, marginBottom: 10, opacity: 0.5 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg)' }}>
                      <img src="https://i.pravatar.cc/40?img=13" alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                      Aurele Franck YANKEU
                    </div>
                    <button onClick={() => setShowAssignPopoverId(null)} style={{ ...actionBtn('var(--brand)'), width: '100%', justifyContent: 'center', marginTop: 12 }}>Fermer</button>
                  </div>
                </div>
              )}

              {/* Delete checklist confirm */}
              {deletingChecklistId && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 340, padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Supprimer Checklist ?</div>
                      <button onClick={() => setDeletingChecklistId(null)} style={toolbarBtn}><X size={14} /></button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 14 }}>La suppression est définitive et irréversible.</div>
                    <button onClick={handleDeleteChecklist} style={{ ...actionBtn('var(--danger)'), width: '100%', justifyContent: 'center' }}>Supprimer la checklist</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle sidebar button when hidden */}
        {!showCommentSidebar && (
          <button onClick={() => setShowCommentSidebar(true)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 6px', borderRadius: 'var(--radius-2) 0 0 var(--radius-2)' }}>
            <MessageSquare size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrelloCardModal;
