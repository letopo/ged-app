// frontend/src/components/WorkflowProgress.jsx
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, User, XCircle, MessageSquare, UserCheck, Send, RefreshCw } from 'lucide-react';
import { workflowAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const WorkflowProgress = ({
  workflows = [],
  documentStatus,
  documentId,
  submittedBy,
  onReassign,
  onRelanced,
  isAdmin = false,
  hideDiscussion = false,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [relancing, setRelancing] = useState(false);
  const [motif, setMotif] = useState('');
  const [showRelanceForm, setShowRelanceForm] = useState(false);
  const commentsEndRef = useRef(null);

  const isRejected = documentStatus === 'rejected';
  const hasWorkflow = documentId && workflows.length > 0;

  const validatorIds = workflows.map(w => w.validator?.id).filter(Boolean);
  const isParticipant = user?.id === submittedBy || validatorIds.includes(user?.id) || isAdmin;
  const isOwner = user?.id === submittedBy || isAdmin;

  useEffect(() => {
    if (hasWorkflow && isParticipant && !hideDiscussion) loadComments();
  }, [documentId]);

  useEffect(() => {
    const el = commentsEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [comments]);

  const loadComments = async () => {
    try {
      const res = await workflowAPI.getComments(documentId);
      setComments(res.data.data || []);
    } catch { /* silencieux */ }
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await workflowAPI.addComment(documentId, newComment.trim());
      setComments(prev => [...prev, res.data.data]);
      setNewComment('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de l\'envoi du commentaire.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleRelancer = async () => {
    setRelancing(true);
    try {
      await workflowAPI.relancerValidation(documentId, motif);
      toast.success('Validation relancée avec succès !');
      setShowRelanceForm(false);
      setMotif('');
      await loadComments();
      if (onRelanced) onRelanced();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la relance.');
    } finally {
      setRelancing(false);
    }
  };

  if (!workflows || workflows.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Aucun workflow initié.</div>;
  }

  const totalSteps = workflows.length;
  let completedSteps = workflows.filter(w => w.status === 'approved').length;
  if (documentStatus === 'approved') {
    completedSteps = totalSteps;
  } else if (isRejected) {
    const rejectedStep = workflows.find(w => w.status === 'rejected');
    if (rejectedStep) completedSteps = rejectedStep.step - 1;
  }
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />;
      case 'pending':  return <Clock size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} className="animate-pulse" />;
      case 'rejected': return <XCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
      default:         return <User size={18} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />;
    }
  };

  const stepStatusColor = (status) => {
    if (status === 'approved') return 'var(--success)';
    if (status === 'rejected') return 'var(--danger)';
    if (status === 'pending')  return 'var(--warning)';
    return 'var(--fg-muted)';
  };

  const inputStyle = {
    flex: 1, fontSize: 12, padding: '6px 12px',
    borderRadius: 'var(--radius-3)', border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--fg)', outline: 'none',
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barre de progression */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 500, color: 'var(--fg)' }}>Progression</span>
          <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{completedSteps} / {totalSteps}</span>
        </div>
        <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: 999, height: 8 }}>
          <div style={{
            height: 8, borderRadius: 999,
            background: isRejected ? 'var(--danger)' : 'var(--brand)',
            width: `${progressPercentage}%`,
            transition: 'width .5s',
          }} />
        </div>
      </div>

      {/* Étapes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {workflows.sort((a, b) => a.step - b.step).map((step) => (
          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {getStatusIcon(step.status)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 500, color: 'var(--fg)' }}>
                  {step.validator?.firstName} {step.validator?.lastName}
                </span>
                {(step.isSubstituted || step.originalValidator) && (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: 'var(--danger)', background: 'var(--danger-soft)', padding: '1px 6px', borderRadius: 999 }}>
                    P.O.{step.originalValidator ? ` ${step.originalValidator.firstName} ${step.originalValidator.lastName}` : ''}
                  </span>
                )}
                <span style={{ marginLeft: 8, color: stepStatusColor(step.status) }}>
                  ({step.status === 'approved' ? 'approuvé' :
                    step.status === 'rejected' ? 'rejeté' :
                    step.status === 'pending' ? 'en attente' :
                    step.status === 'queued' ? 'en file' : step.status})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {step.validatedAt && (
                  <span style={{ color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
                    {new Date(step.validatedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {isAdmin && ['pending', 'queued'].includes(step.status) && onReassign && (
                  <button
                    onClick={() => onReassign(step)}
                    title="Réaffecter à un autre validateur"
                    style={{
                      padding: 4, borderRadius: 'var(--radius-2)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--brand)', transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <UserCheck size={14} />
                  </button>
                )}
              </div>
            </div>
            {step.comment && (
              <div style={{
                marginLeft: 30, padding: '6px 12px',
                borderRadius: 'var(--radius-2)', border: '1px solid',
                display: 'flex', alignItems: 'flex-start', gap: 6,
                background: step.status === 'rejected' ? 'var(--danger-soft)'  : step.status === 'approved' ? 'var(--success-soft)' : 'var(--surface-2)',
                borderColor: step.status === 'rejected' ? 'var(--danger)' : step.status === 'approved' ? 'var(--success)' : 'var(--border)',
              }}>
                <MessageSquare size={11} style={{ marginTop: 1, flexShrink: 0, color: stepStatusColor(step.status) }} />
                <span style={{ color: stepStatusColor(step.status) }}>{step.comment}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fil de discussion */}
      {hasWorkflow && isParticipant && !hideDiscussion && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <MessageSquare size={14} />
            Discussion
            {comments.length > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 10, padding: '2px 6px', borderRadius: 999, fontWeight: 700 }}>
                {comments.length}
              </span>
            )}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 208, overflowY: 'auto', paddingRight: 4 }}>
            {comments.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>Aucun message pour l'instant.</p>
            )}
            {comments.map((c) => {
              const isMe = c.author?.id === user?.id;
              const isSystem = c.text.startsWith('🔄');
              if (isSystem) {
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-muted)', background: 'var(--surface-2)', padding: '2px 12px', borderRadius: 999 }}>
                      {c.text}
                    </span>
                  </div>
                );
              }
              return (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '6px 12px', borderRadius: 'var(--radius-3)', fontSize: 12,
                    background: isMe ? 'var(--brand)' : 'var(--surface-2)',
                    color: isMe ? '#fff' : 'var(--fg)',
                    borderBottomRightRadius: isMe ? 2 : undefined,
                    borderBottomLeftRadius: isMe ? undefined : 2,
                  }}>
                    {!isMe && (
                      <p style={{ fontWeight: 600, marginBottom: 2, color: 'var(--fg-muted)', fontSize: 11 }}>
                        {c.author?.firstName} {c.author?.lastName}
                      </p>
                    )}
                    <p style={{ margin: 0 }}>{c.text}</p>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2, padding: '0 4px' }}>
                    {new Date(c.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={commentsEndRef} />
          </div>

          {/* Saisie */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
              placeholder="Envoyer un message…"
              style={inputStyle}
            />
            <button
              onClick={handleSendComment}
              disabled={sendingComment || !newComment.trim()}
              title="Envoyer"
              style={{
                padding: 8, borderRadius: 'var(--radius-3)',
                background: 'var(--brand)', color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (sendingComment || !newComment.trim()) ? 0.5 : 1,
                transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!sendingComment && newComment.trim()) e.currentTarget.style.background = 'var(--brand-active)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
            >
              <Send size={14} />
            </button>
          </div>

          {/* Bouton relancer */}
          {isRejected && isOwner && (
            <div style={{ paddingTop: 4 }}>
              {!showRelanceForm ? (
                <button
                  onClick={() => setShowRelanceForm(true)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '8px 16px', fontSize: 12, fontWeight: 500,
                    background: '#f97316', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-3)', cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ea6c0a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f97316'}
                >
                  <RefreshCw size={14} />
                  Relancer la validation
                </button>
              ) : (
                <div style={{
                  padding: 12, borderRadius: 'var(--radius-3)',
                  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.30)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#c2410c', margin: 0 }}>Motif de la relance (optionnel)</p>
                  <textarea
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    placeholder="Ex : Signature ajoutée, informations complétées…"
                    rows={2}
                    style={{
                      width: '100%', fontSize: 12, padding: '6px 12px',
                      borderRadius: 'var(--radius-2)', border: '1px solid rgba(249,115,22,0.4)',
                      background: 'var(--surface)', color: 'var(--fg)', outline: 'none', resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleRelancer}
                      disabled={relancing}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '6px 12px', fontSize: 12, fontWeight: 500,
                        background: '#f97316', color: '#fff',
                        border: 'none', borderRadius: 'var(--radius-2)', cursor: 'pointer',
                        opacity: relancing ? 0.6 : 1,
                      }}
                    >
                      <RefreshCw size={12} className={relancing ? 'animate-spin' : ''} />
                      {relancing ? 'Relance…' : 'Confirmer la relance'}
                    </button>
                    <button
                      onClick={() => { setShowRelanceForm(false); setMotif(''); }}
                      style={{
                        padding: '6px 12px', fontSize: 12,
                        borderRadius: 'var(--radius-2)', border: '1px solid var(--border)',
                        background: 'none', color: 'var(--fg-muted)', cursor: 'pointer',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowProgress;
