// frontend/src/components/TrelloCard.jsx
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, FileText, Pencil, AlignLeft } from 'lucide-react';

const PRIORITY_COLOR = {
  urgent: { bg: '#fee2e2', color: '#b91c1c' },
  high:   { bg: '#ffedd5', color: '#c2410c' },
  medium: { bg: '#dbeafe', color: '#1d4ed8' },
};

const TrelloCard = ({ card, index, onClick }) => {
  const priorityStyle = PRIORITY_COLOR[card.priority];

  const handleEditClick = (e) => {
    e.stopPropagation();
    onClick(card);
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card)}
          style={{
            ...provided.draggableProps.style,
            position: 'relative',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-2)',
            boxShadow: snapshot.isDragging ? 'var(--shadow-3)' : 'var(--shadow-1)',
            border: snapshot.isDragging ? '1.5px solid var(--brand)' : '1px solid var(--border)',
            marginBottom: 8,
            cursor: 'pointer',
            transform: snapshot.isDragging ? `${provided.draggableProps.style?.transform} rotate(2deg)` : provided.draggableProps.style?.transform,
          }}
          onMouseEnter={e => { if (!snapshot.isDragging) e.currentTarget.style.borderColor = 'var(--brand)'; }}
          onMouseLeave={e => { if (!snapshot.isDragging) e.currentTarget.style.borderColor = 'var(--border)'; }}
          className="group"
        >
          {/* Bouton édition rapide */}
          <button
            onClick={handleEditClick}
            title="Modifier rapidement"
            style={{
              position: 'absolute', top: 4, right: 4, padding: 5,
              background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
              color: 'var(--fg-muted)', borderRadius: 'var(--radius-2)',
              display: 'none', zIndex: 10,
            }}
            className="group-hover-show"
          >
            <Pencil size={13} />
          </button>

          <div style={{ padding: '8px 12px' }}>
            {/* Labels et Priorité */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {priorityStyle && (
                <span style={{ height: 8, width: 32, borderRadius: 999, background: priorityStyle.bg }} title={`Priorité: ${card.priority}`} />
              )}
              {card.labels && card.labels.map((label, idx) => (
                <span key={idx} style={{ height: 8, width: 32, borderRadius: 999, background: 'var(--success-soft)' }} title={label} />
              ))}
            </div>

            {/* Titre */}
            <p style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4, marginBottom: 6, paddingRight: 16 }}>
              {card.title}
            </p>

            {/* Indicateurs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg-muted)' }}>
              {card.description && card.description.length > 0 && (
                <div title="Cette carte a une description"><AlignLeft size={13} /></div>
              )}
              {card.dueDate && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '1px 5px', borderRadius: 'var(--radius-2)',
                  background: new Date(card.dueDate) < new Date() ? 'var(--danger-soft)' : 'transparent',
                  color: new Date(card.dueDate) < new Date() ? 'var(--danger)' : 'var(--fg-muted)',
                }}>
                  <Clock size={11} />
                  <span>{new Date(card.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                </div>
              )}
              {card.workRequest && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--info)', fontWeight: 500 }} title="Demande de Travaux liée">
                  <FileText size={11} />
                </div>
              )}
            </div>

            {/* Assignee */}
            {card.assignee && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--brand-soft)', color: 'var(--brand)',
                  fontSize: 10, fontWeight: 700,
                  border: '2px solid var(--surface)',
                }} title={`${card.assignee.firstName} ${card.assignee.lastName}`}>
                  {card.assignee.firstName.charAt(0)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TrelloCard;
