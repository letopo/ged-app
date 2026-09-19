// frontend/src/components/DemandeAchatDetail.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { demandeAchatAPI, documentsAPI } from '../services/api';
import {
  X, Edit, Trash2, CheckCircle, XCircle, Clock, FileText, User, Calendar,
  Package, Phone, Mail, MapPin, Download, AlertCircle, Loader, Eye, ExternalLink,
  FolderOpen, AlertTriangle
} from 'lucide-react';

const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return defaultValue;
  return num;
};

// ── Style constants ──
const sectionStyle = {
  marginBottom: 16, padding: '16px 18px', background: 'var(--surface-2)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-3)',
};
const sectionTitleStyle = {
  fontSize: 14, fontWeight: 700, color: 'var(--fg)',
  borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 14,
};
const thStyle = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: 'var(--fg-muted)', textTransform: 'uppercase', background: 'var(--surface-2)',
};
const tdStyle = { padding: '8px 12px', fontSize: 13, color: 'var(--fg)', borderBottom: '1px solid var(--border)' };
const btnStyle = (bg, color = '#fff') => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)',
  border: 'none', background: bg, color, fontSize: 13, fontWeight: 500, cursor: 'pointer',
});

const STATUS_CFG = {
  draft:            { label: 'Brouillon', Icon: FileText,    color: 'var(--fg-muted)',   bg: 'var(--surface-2)' },
  pending_approval: { label: "En attente d'approbation", Icon: Clock, color: 'var(--warning)', bg: 'var(--warning-soft)' },
  approved:         { label: 'Approuvée',    Icon: CheckCircle,  color: 'var(--success)',  bg: 'var(--success-soft)' },
  rejected:         { label: 'Rejetée',      Icon: XCircle,      color: 'var(--danger)',   bg: 'var(--danger-soft)' },
  in_progress:      { label: 'En cours',     Icon: AlertCircle,  color: 'var(--brand)',    bg: 'var(--brand-soft)' },
  completed:        { label: 'Terminée',     Icon: CheckCircle,  color: 'var(--success)',  bg: 'var(--success-soft)' },
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
    <Icon size={16} color="var(--fg-subtle)" style={{ marginTop: 2, flexShrink: 0 }} />
    <div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{value || 'Non renseigné'}</div>
    </div>
  </div>
);

export default function DemandeAchatDetail({ demande, onClose, onEdit, onUpdate }) {
  const { user } = useAuth();
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDTModal, setShowDTModal]         = useState(false);
  const [dtDetails, setDtDetails]             = useState(null);
  const [loadingDT, setLoadingDT]             = useState(false);

  const isOwner       = user?.id === demande.requesterId;
  const isAdminOrAchat = user?.role === 'admin' || user?.role === 'achat';
  const canEdit        = (isOwner && demande.status === 'draft') || isAdminOrAchat;
  const canDelete      = (isOwner && demande.status === 'draft') || user?.role === 'admin';

  const loadDTDetails = async () => {
    if (!demande.linkedDocNumber) return;
    try {
      setLoadingDT(true);
      setError('');
      const response  = await documentsAPI.getAll();
      let documents   = response.data?.data || response.data || [];
      const dtDocument = documents.find(doc => {
        const title    = (doc.title || '').toLowerCase();
        const docNumber = (doc.documentNumber || doc.number || '').toLowerCase();
        const search   = demande.linkedDocNumber.toLowerCase();
        return title.includes(search) || docNumber.includes(search) || title.includes('dt') || (doc.metadata && doc.metadata.type === 'demande_travaux');
      });
      setDtDetails(dtDocument || null);
      setShowDTModal(true);
    } catch (err) {
      setError(`Erreur technique: ${err.message}`);
      setShowDTModal(true);
    } finally {
      setLoadingDT(false);
    }
  };

  const closeDTModal = () => { setShowDTModal(false); setDtDetails(null); setError(''); };

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      setError('');
      await demandeAchatAPI.updateStatus(demande.id, newStatus);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de statut');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await demandeAchatAPI.delete(demande.id);
      onClose();
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const cfg = STATUS_CFG[demande.status] || STATUS_CFG.draft;
  const { Icon: StatusIcon } = cfg;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{demande.daNumber}</div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 999,
                background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600,
              }}>
                <StatusIcon size={13} /> {cfg.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{demande.domain}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {canEdit && (
              <button onClick={() => onEdit(demande)} style={btnStyle('var(--brand)')}>
                <Edit size={14} /> Modifier
              </button>
            )}
            {canDelete && (
              <button onClick={() => setShowDeleteConfirm(true)} style={btnStyle('var(--danger)')}>
                <Trash2 size={14} /> Supprimer
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex', padding: 6, borderRadius: 'var(--radius-2)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', marginBottom: 14, background: 'var(--danger-soft)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-2)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Admin quick actions */}
        {isAdminOrAchat && demande.status !== 'draft' && (
          <div style={{ ...sectionStyle, background: 'var(--brand-soft)', border: '1px solid var(--brand)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 10 }}>Actions rapides</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {demande.status === 'pending_approval' && (
                <>
                  <button onClick={() => handleStatusChange('approved')} disabled={loading} style={btnStyle('var(--success)')}>
                    {loading ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approuver
                  </button>
                  <button onClick={() => handleStatusChange('rejected')} disabled={loading} style={btnStyle('var(--danger)')}>
                    {loading ? <Loader size={13} className="animate-spin" /> : <XCircle size={13} />} Rejeter
                  </button>
                </>
              )}
              {demande.status === 'approved' && (
                <button onClick={() => handleStatusChange('in_progress')} disabled={loading} style={btnStyle('var(--brand)')}>
                  {loading ? <Loader size={13} className="animate-spin" /> : <AlertCircle size={13} />} Marquer en cours
                </button>
              )}
              {demande.status === 'in_progress' && (
                <button onClick={() => handleStatusChange('completed')} disabled={loading} style={btnStyle('var(--success)')}>
                  {loading ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />} Marquer terminée
                </button>
              )}
            </div>
          </div>
        )}

        {isOwner && demande.status === 'draft' && (
          <div style={{ ...sectionStyle, background: 'var(--warning-soft)', border: '1px solid var(--warning)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 10 }}>Cette demande est en brouillon</div>
            <button onClick={() => handleStatusChange('pending_approval')} disabled={loading} style={btnStyle('var(--brand)')}>
              {loading ? <Loader size={13} className="animate-spin" /> : <CheckCircle size={13} />} Soumettre pour approbation
            </button>
          </div>
        )}

        {/* Informations générales */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Informations générales</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <InfoRow icon={Calendar} label="Date de la DA"             value={new Date(demande.daDate).toLocaleDateString()} />
            <InfoRow icon={Calendar} label="Date de livraison"         value={demande.deliveryDate ? new Date(demande.deliveryDate).toLocaleDateString() : 'Non définie'} />
            <InfoRow icon={Package}  label="Type d'achat"              value={demande.purchaseType} />
            <InfoRow icon={FileText} label="Nature article"            value={demande.articleNature} />
            <InfoRow icon={User}     label="Demandeur"                 value={`${demande.requester?.firstName} ${demande.requester?.lastName}`} />
            <InfoRow icon={MapPin}   label="Description du domaine"    value={demande.domainDescription} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <InfoRow icon={FileText} label="Description de la demande" value={demande.requestDescription} />
          </div>
        </div>

        {/* Bénéficiaire */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Informations bénéficiaire</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 24px', marginBottom: 12 }}>
            <InfoRow icon={User}  label="Nom"       value={demande.beneficiaryName} />
            <InfoRow icon={Mail}  label="Email"     value={demande.beneficiaryEmail} />
            <InfoRow icon={Phone} label="Téléphone" value={demande.beneficiaryPhone} />
          </div>
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <InfoRow icon={Package} label="Sortie Magasin" value={demande.isMagasinOutput ? 'Oui' : 'Non'} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <FileText size={16} color="var(--fg-subtle)" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 2 }}>DA pour travaux</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{demande.isForWorks ? 'Oui' : 'Non'}</span>
                  {demande.isForWorks && demande.linkedDocNumber && (
                    <button
                      onClick={loadDTDetails} disabled={loadingDT}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', display: 'flex', padding: 2 }}
                      title="Visualiser la DT"
                    >
                      {loadingDT ? <Loader size={14} className="animate-spin" /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {demande.isForWorks && demande.linkedDocNumber && (
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={11} /> DT : {demande.linkedDocNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Articles */}
        {demande.nonRefArticles && demande.nonRefArticles.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Articles non référencés</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={thStyle}>Désignation</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Quantité</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Prix Unitaire</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {demande.nonRefArticles.map((art, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{art.designation}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{art.quantity}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{safeNumber(art.unitPrice).toFixed(2)} XAF</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{safeNumber(art.total).toFixed(2)} XAF</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>Total Non Référencé</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontSize: 15, fontWeight: 700, color: 'var(--brand)' }}>
                      {safeNumber(demande.totalNonRefValue).toFixed(2)} XAF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pièces jointes */}
        {demande.attachedDocuments && demande.attachedDocuments.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Pièces jointes ({demande.attachedDocuments.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {demande.attachedDocuments.map((file, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FileText size={16} color="var(--brand)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.originalName}</div>
                      <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{(file.size / 1024).toFixed(1)} KB · {new Date(file.uploadedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${file.path}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--brand)', display: 'flex', padding: 4, flexShrink: 0 }}>
                    <Download size={15} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Historique</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Demande créée</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(demande.createdAt).toLocaleString()} par {demande.requester?.firstName} {demande.requester?.lastName}</div>
              </div>
            </div>
            {demande.updatedAt !== demande.createdAt && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Dernière modification</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(demande.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 420, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>Confirmer la suppression</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
              Êtes-vous sûr de vouloir supprimer cette demande d'achat ? Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleDelete} disabled={loading} style={{ ...btnStyle('var(--danger)'), opacity: loading ? 0.6 : 1 }}>
                {loading && <Loader size={13} className="animate-spin" />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DT Modal */}
      {showDTModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 16 }}>
          <div className="animate-fadeIn" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-3)', width: '100%', maxWidth: 680, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={18} color="var(--brand)" />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>Demande de Travaux</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Référence : {demande.linkedDocNumber}</div>
                </div>
              </div>
              <button onClick={closeDTModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
              {loadingDT ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: 'var(--fg-muted)', fontSize: 13 }}>
                  <Loader size={20} color="var(--brand)" className="animate-spin" /> Chargement de la DT…
                </div>
              ) : dtDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ padding: '12px 14px', background: 'var(--brand-soft)', border: '1px solid var(--brand)', borderRadius: 'var(--radius-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{dtDetails.title || dtDetails.name || 'Demande de Travaux'}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{dtDetails.documentNumber || dtDetails.number || demande.linkedDocNumber}</div>
                    </div>
                    {dtDetails.status && (
                      <span style={{ background: dtDetails.status === 'approved' ? 'var(--success-soft)' : dtDetails.status === 'rejected' ? 'var(--danger-soft)' : 'var(--warning-soft)', color: dtDetails.status === 'approved' ? 'var(--success)' : dtDetails.status === 'rejected' ? 'var(--danger)' : 'var(--warning)', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                        {dtDetails.status === 'approved' ? 'Approuvée' : dtDetails.status === 'rejected' ? 'Rejetée' : dtDetails.status}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                    {[
                      { label: 'Service', value: dtDetails.metadata?.service || dtDetails.service || demande.domain || '—' },
                      { label: 'Date de création', value: dtDetails.createdAt ? new Date(dtDetails.createdAt).toLocaleDateString() : '—' },
                      { label: 'Demandeur', value: dtDetails.requester?.name || dtDetails.createdBy || dtDetails.user?.name || '—' },
                      { label: 'Type', value: dtDetails.type || dtDetails.documentType || 'Demande de Travaux' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {(dtDetails.description || dtDetails.content) && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--fg-subtle)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                      <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-2)', fontSize: 13, color: 'var(--fg)', whiteSpace: 'pre-line' }}>
                        {dtDetails.description || dtDetails.content}
                      </div>
                    </div>
                  )}
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <a href={`/documents/${dtDetails.id}`} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle('var(--brand)'), textDecoration: 'none' }}>
                      <ExternalLink size={13} /> Ouvrir la DT complète
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <AlertTriangle size={40} color="var(--warning)" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 8 }}>DT non trouvée</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 16 }}>
                    La Demande de Travaux <strong>"{demande.linkedDocNumber}"</strong> n'a pas été trouvée.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button onClick={closeDTModal} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer' }}>Fermer</button>
                    <a href={`/documents?search=${encodeURIComponent(demande.linkedDocNumber)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnStyle('var(--brand)'), textDecoration: 'none' }}>
                      <FolderOpen size={13} /> Rechercher dans les documents
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
