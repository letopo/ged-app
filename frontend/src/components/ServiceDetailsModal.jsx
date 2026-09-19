// frontend/src/components/ServiceDetailsModal.jsx
import React, { useState } from 'react';
import { X, Trash2, UserMinus, Building2, UserPlus, Pencil, Check } from 'lucide-react';

export default function ServiceDetailsModal({ service, onClose, onRemoveMember, onDeleteService, onAddMember, onRenameService }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(service.name);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');

  const groupedMembers = service.members?.reduce((acc, member) => {
    if (!acc[member.fonction]) acc[member.fonction] = [];
    acc[member.fonction].push(member);
    return acc;
  }, {});

  const startEdit = () => { setNameDraft(service.name); setRenameError(''); setIsEditingName(true); };
  const cancelEdit = () => { setIsEditingName(false); setRenameError(''); };
  const saveEdit = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === service.name) { setIsEditingName(false); return; }
    setRenaming(true);
    setRenameError('');
    try {
      await onRenameService(service.id, trimmed);
      setIsEditingName(false);
    } catch (err) {
      setRenameError(err?.response?.data?.message || 'Impossible de renommer le service.');
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16,
    }}>
      <div className="animate-fadeIn" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)',
        width: '100%', maxWidth: 640, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'var(--brand)', padding: '16px 20px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={22} color="#fff" />
            <div>
              {isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                    disabled={renaming}
                    style={{
                      height: 28, padding: '0 8px', borderRadius: 'var(--radius-2)',
                      border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)',
                      color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none',
                    }}
                  />
                  <button
                    onClick={saveEdit} disabled={renaming} title="Enregistrer"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', padding: 4 }}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelEdit} disabled={renaming} title="Annuler"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : null}
              {isEditingName && renameError && (
                <div style={{ fontSize: 11, color: '#FFD1D1', marginTop: 4 }}>{renameError}</div>
              )}
              {!isEditingName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{service.name}</div>
                  {onRenameService && (
                    <button
                      onClick={startEdit} title="Renommer le service"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', display: 'flex', padding: 2 }}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                {service.members?.length || 0} membre{(service.members?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {!service.members || service.members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg-muted)', fontSize: 13 }}>
              Aucun membre dans ce service
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(groupedMembers || {}).map(([fonction, members]) => (
                <div key={fonction}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{
                      background: 'var(--brand-soft)', color: 'var(--brand)',
                      padding: '3px 10px', borderRadius: 'var(--radius-2)',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {fonction}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>({members.length})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {members.map(member => (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-3)', background: 'var(--surface-2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'var(--brand)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                              {member.user.firstName} {member.user.lastName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{member.user.email}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => onRemoveMember(service.id, member.id)}
                          title="Retirer du service"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', display: 'flex', padding: 6, borderRadius: 'var(--radius-2)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--fg-subtle)'; }}
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)', padding: '14px 20px',
          background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <button
            onClick={() => onDeleteService(service.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
              border: 'none', background: 'var(--danger)', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> Supprimer le service
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {onAddMember && (
              <button
                onClick={() => onAddMember(service)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
                  border: 'none', background: 'var(--brand)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <UserPlus size={14} /> Ajouter un membre
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                height: 34, padding: '0 16px', borderRadius: 'var(--radius-2)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
