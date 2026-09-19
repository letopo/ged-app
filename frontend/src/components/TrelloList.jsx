// frontend/src/components/TrelloList.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TrelloCard from './TrelloCard';
import { Plus, MoreHorizontal, X, ArrowLeftToLine, ArrowRightToLine, Copy, Archive, ArrowRight } from 'lucide-react';

export default function TrelloList({ list, cards, onCardClick, onAddCard }) {
  const [isAdding, setIsAdding]         = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const menuRef    = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
    }
  }, [isAdding]);

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    setNewCardTitle(e.target.value);
  };

  const handleSubmit = async () => {
    if (!newCardTitle.trim()) return;
    await onAddCard(list.id, newCardTitle);
    setNewCardTitle('');
    setIsAdding(true);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') setIsAdding(false);
  };

  const iconBtnStyle = {
    padding: '5px', background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)', display: 'flex',
  };

  // ── Collapsed ──
  if (isCollapsed) {
    return (
      <div
        onClick={() => setIsCollapsed(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: 44, flexShrink: 0, background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
          padding: '10px 0', cursor: 'pointer', gap: 8,
        }}
      >
        <ArrowRightToLine size={18} color="var(--fg-muted)" />
        <span style={{
          fontWeight: 600, fontSize: 13, color: 'var(--fg)',
          writingMode: 'vertical-rl', textOrientation: 'mixed', flex: 1,
        }}>
          {list.name}
        </span>
        <span style={{
          background: 'var(--brand-soft)', color: 'var(--brand)',
          fontSize: 11, fontWeight: 700, padding: '2px 5px', borderRadius: 999,
        }}>
          {cards.length}
        </span>
      </div>
    );
  }

  // ── Full ──
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: 272, flexShrink: 0,
      maxHeight: '100%', background: 'var(--surface-2)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
      position: 'relative',
    }}>

      {/* Header */}
      <div style={{ padding: '10px 10px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: 'var(--fg)', padding: '4px 6px', borderRadius: 'var(--radius-2)' }}>
          {list.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button onClick={() => setIsCollapsed(true)} style={iconBtnStyle} title="Réduire">
            <ArrowLeftToLine size={14} />
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={iconBtnStyle}>
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 28, width: 220, zIndex: 50,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>Actions</span>
                  <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex' }}><X size={12} /></button>
                </div>
                {[
                  { Icon: Plus,    label: 'Ajouter une carte',  action: () => { setIsAdding(true); setShowMenu(false); }, danger: false },
                  { Icon: Copy,    label: 'Copier la liste',    action: () => setShowMenu(false), danger: false },
                  { Icon: ArrowRight, label: 'Déplacer la liste', action: () => setShowMenu(false), danger: false },
                  { Icon: Archive, label: 'Archiver cette liste', action: () => setShowMenu(false), danger: true },
                ].map(({ Icon, label, action, danger }) => (
                  <button
                    key={label} onClick={action}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: danger ? 'var(--danger)' : 'var(--fg)', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards */}
      <Droppable droppableId={list.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            style={{
              flex: 1, padding: '0 6px', overflowY: 'auto', minHeight: 50,
              maxHeight: 'calc(100vh - 200px)',
              background: snapshot.isDraggingOver ? 'var(--brand-soft)' : 'transparent',
              transition: 'background .15s',
            }}
          >
            {cards.map((card, index) => (
              <TrelloCard key={card.id} card={{ ...card, listName: list.name }} index={index} onClick={onCardClick} />
            ))}
            {provided.placeholder}

            {isAdding && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-2)', padding: 8, marginBottom: 6,
                }}>
                  <textarea
                    ref={textareaRef}
                    value={newCardTitle}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Saisissez un titre…"
                    style={{
                      width: '100%', resize: 'none', background: 'transparent',
                      border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg)',
                      minHeight: 60, overflow: 'hidden', lineHeight: 1.5,
                    }}
                    rows={1}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={handleSubmit}
                    style={{
                      height: 30, padding: '0 12px', borderRadius: 'var(--radius-2)', border: 'none',
                      background: 'var(--brand)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Ajouter une carte
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {!isAdding && (
        <div style={{ padding: '4px 6px 8px' }}>
          <button
            onClick={() => setIsAdding(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fg-muted)', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-2)',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Plus size={14} /> Ajouter une carte
          </button>
        </div>
      )}
    </div>
  );
}
