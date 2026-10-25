// frontend/src/components/vehicles/fleetForms.jsx
// Formulaires du suivi du parc : plein de carburant, entretien / réparation,
// échéance, échéance réalisée — et une pièce jointe (photo ou PDF).
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { X, Paperclip, Loader, Check } from 'lucide-react';
import { vehiclesAPI, getFileBaseUrl } from '../../services/api';

export const DEADLINE_KINDS = { assurance: 'Assurance', visite_technique: 'Visite technique', vidange: 'Vidange', extincteur: 'Extincteur', autre: 'Autre' };
export const MAINTENANCE_KINDS = { vidange: 'Vidange', revision: 'Révision / contrôle', reparation: 'Réparation', pneus: 'Pneus', freins: 'Freins', carrosserie: 'Carrosserie', autre: 'Autre' };
export const MAINTENANCE_STATUS = { a_faire: 'À faire', en_cours: 'En cours', terminee: 'Terminé' };
export const DEADLINE_STATUS = {
  depassee: { label: 'Dépassée', color: '#dc2626', bg: '#fee2e2' },
  bientot: { label: 'Bientôt', color: '#ea580c', bg: '#ffedd5' },
  ok: { label: 'À jour', color: '#16a34a', bg: '#dcfce7' },
  a_renseigner: { label: 'À renseigner', color: '#64748b', bg: '#f1f5f9' },
};
export const money = (n) => (n ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—');
export const km = (n) => (n !== null && n !== undefined ? `${Number(n).toLocaleString('fr-FR')} km` : '—');
export const frDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
export const fileUrl = (p) => (p ? `${getFileBaseUrl()}/${p}` : null);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Douala' });

export const field = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 10px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', fontSize: 14 };
const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

export function DeadlineBadge({ status }) {
  const { t } = useTranslation();
  const st = DEADLINE_STATUS[status] || DEADLINE_STATUS.a_renseigner;
  return <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{t(st.label)}</span>;
}

export function Modal({ title, onClose, children, onSubmit, saving, submitLabel }) {
  const { t } = useTranslation();
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius-4)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{title}</div>
          <button type="button" onClick={onClose} aria-label={t('Fermer')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ height: 38, padding: '0 14px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>{t('Annuler')}</button>
          <button type="submit" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 'var(--radius-2)', border: 'none', background: 'var(--brand)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />} {submitLabel || t('Enregistrer')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export function Field({ label, children }) {
  return <label style={{ display: 'block', flex: '1 1 0', minWidth: 0 }}><span style={lbl}>{label}</span>{children}</label>;
}

// Pièce jointe : photo (appareil) ou PDF
export function AttachmentInput({ value, onChange }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const r = await vehiclesAPI.uploadAttachment(f);
      onChange(r.data.data.path);
    } catch (err) {
      toast.error(err.response?.data?.message || t('Fichier non envoyé.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input ref={ref} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={pick} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 'var(--radius-2)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' }}>
        {busy ? <Loader size={14} className="animate-spin" /> : <Paperclip size={14} />} {value ? t('Remplacer la pièce') : t('Joindre (photo ou PDF)')}
      </button>
      {value && <a href={fileUrl(value)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)' }}>{t('Voir')}</a>}
    </div>
  );
}

const useSave = (fn, onDone, t) => {
  const [saving, setSaving] = useState(false);
  const run = async () => {
    setSaving(true);
    try { await fn(); toast.success(t('Enregistré.')); onDone?.(); }
    catch (err) { toast.error(err.response?.data?.message || t('Erreur serveur.')); }
    finally { setSaving(false); }
  };
  return [saving, run];
};

export function FuelForm({ vehicle, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ date: today(), liters: '', amount: '', mileage: '', station: '', fullTank: true, attachmentPath: null });
  const [saving, save] = useSave(() => vehiclesAPI.addFuel(vehicle.id, f), onDone, t);
  return (
    <Modal title={t('Plein de carburant — {{v}}', { v: vehicle.label })} onClose={onClose} onSubmit={save} saving={saving}>
      <Field label={t('Date')}><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={field} /></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={`${t('Litres')} *`}><input required inputMode="decimal" value={f.liters} onChange={(e) => setF({ ...f, liters: e.target.value })} style={field} /></Field>
        <Field label={t('Montant (FCFA)')}><input type="number" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={field} /></Field>
      </div>
      <Field label={t('Kilométrage au compteur')}><input type="number" min="0" value={f.mileage} onChange={(e) => setF({ ...f, mileage: e.target.value })} placeholder={vehicle.mileage ? t('Dernier relevé : {{km}} km', { km: vehicle.mileage.toLocaleString('fr-FR') }) : ''} style={field} /></Field>
      <Field label={t('Station')}><input value={f.station} onChange={(e) => setF({ ...f, station: e.target.value })} style={field} /></Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg)' }}>
        <input type="checkbox" checked={f.fullTank} onChange={(e) => setF({ ...f, fullTank: e.target.checked })} /> {t('Plein complet (sert au calcul de la consommation)')}
      </label>
      <Field label={t('Ticket / facture')}><AttachmentInput value={f.attachmentPath} onChange={(p) => setF({ ...f, attachmentPath: p })} /></Field>
    </Modal>
  );
}

export function MaintenanceForm({ vehicle, initial, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ kind: 'reparation', status: 'terminee', date: today(), mileage: '', description: '', garage: '', cost: '', attachmentPath: null, immobilize: false, putBackInService: false, ...(initial || {}) });
  const [saving, save] = useSave(() => (f.id ? vehiclesAPI.updateMaintenance(vehicle.id, f.id, f) : vehiclesAPI.createMaintenance(vehicle.id, f)), onDone, t);
  return (
    <Modal title={f.id ? t('Modifier l\'entretien') : t('Entretien / réparation — {{v}}', { v: vehicle.label })} onClose={onClose} onSubmit={save} saving={saving}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Type')}><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={field}>{Object.entries(MAINTENANCE_KINDS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
        <Field label={t('Statut')}><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} style={field}>{Object.entries(MAINTENANCE_STATUS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
      </div>
      <Field label={`${t('Description')} *`}><textarea required value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} style={{ ...field, height: 'auto', padding: 10 }} /></Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Date')}><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={field} /></Field>
        <Field label={t('Kilométrage')}><input type="number" min="0" value={f.mileage ?? ''} onChange={(e) => setF({ ...f, mileage: e.target.value })} style={field} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Garage')}><input value={f.garage || ''} onChange={(e) => setF({ ...f, garage: e.target.value })} style={field} /></Field>
        <Field label={t('Coût (FCFA)')}><input type="number" min="0" value={f.cost ?? ''} onChange={(e) => setF({ ...f, cost: e.target.value })} style={field} /></Field>
      </div>
      <Field label={t('Facture / devis')}><AttachmentInput value={f.attachmentPath} onChange={(p) => setF({ ...f, attachmentPath: p })} /></Field>
      {f.status !== 'terminee' && vehicle.status === 'disponible' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b91c1c' }}>
          <input type="checkbox" checked={f.immobilize} onChange={(e) => setF({ ...f, immobilize: e.target.checked })} /> {t('Le véhicule est immobilisé (le rendre indisponible)')}
        </label>
      )}
      {f.status === 'terminee' && vehicle.status === 'indisponible' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#15803d' }}>
          <input type="checkbox" checked={f.putBackInService} onChange={(e) => setF({ ...f, putBackInService: e.target.checked })} /> {t('Remettre le véhicule en service')}
        </label>
      )}
    </Modal>
  );
}

export function DeadlineForm({ vehicle, initial, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ kind: 'autre', label: '', dueDate: '', dueMileage: '', intervalMonths: '', intervalKm: '', notes: '', attachmentPath: null, ...(initial || {}) });
  const [saving, save] = useSave(() => (f.id ? vehiclesAPI.updateDeadline(vehicle.id, f.id, f) : vehiclesAPI.createDeadline(vehicle.id, f)), onDone, t);
  return (
    <Modal title={f.id ? t('Échéance : {{l}}', { l: f.label }) : t('Nouvelle échéance')} onClose={onClose} onSubmit={save} saving={saving}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Type')}><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, label: f.label || t(DEADLINE_KINDS[e.target.value]) })} style={field}>{Object.entries(DEADLINE_KINDS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></Field>
        <Field label={`${t('Libellé')} *`}><input required value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} style={field} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Échéance (date)')}><input type="date" value={f.dueDate || ''} onChange={(e) => setF({ ...f, dueDate: e.target.value })} style={field} /></Field>
        <Field label={t('Échéance (km)')}><input type="number" min="0" value={f.dueMileage ?? ''} onChange={(e) => setF({ ...f, dueMileage: e.target.value })} style={field} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Renouveler tous les (mois)')}><input type="number" min="0" value={f.intervalMonths ?? ''} onChange={(e) => setF({ ...f, intervalMonths: e.target.value })} style={field} /></Field>
        <Field label={t('… ou tous les (km)')}><input type="number" min="0" value={f.intervalKm ?? ''} onChange={(e) => setF({ ...f, intervalKm: e.target.value })} style={field} /></Field>
      </div>
      <Field label={t('Notes')}><input value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} style={field} /></Field>
      <Field label={t('Attestation / justificatif')}><AttachmentInput value={f.attachmentPath} onChange={(p) => setF({ ...f, attachmentPath: p })} /></Field>
    </Modal>
  );
}

export function DeadlineDoneForm({ vehicle, deadline, onClose, onDone }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ date: today(), mileage: vehicle.mileage ?? '', cost: '', garage: '', dueDate: '', attachmentPath: null });
  const [saving, save] = useSave(() => vehiclesAPI.completeDeadline(vehicle.id, deadline.id, f), onDone, t);
  return (
    <Modal title={t('{{l}} : réalisée', { l: deadline.label })} onClose={onClose} onSubmit={save} saving={saving} submitLabel={t('Valider')}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {t('La prochaine échéance sera calculée automatiquement')}{deadline.intervalMonths ? ` (+${deadline.intervalMonths} ${t('mois')})` : ''}{deadline.intervalKm ? ` (+${deadline.intervalKm.toLocaleString('fr-FR')} km)` : ''}.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Date')}><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={field} /></Field>
        <Field label={t('Kilométrage')}><input type="number" min="0" value={f.mileage} onChange={(e) => setF({ ...f, mileage: e.target.value })} style={field} /></Field>
      </div>
      {!deadline.intervalMonths && <Field label={t('Prochaine échéance (date)')}><input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} style={field} /></Field>}
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label={t('Garage / organisme')}><input value={f.garage} onChange={(e) => setF({ ...f, garage: e.target.value })} style={field} /></Field>
        <Field label={t('Coût (FCFA)')}><input type="number" min="0" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} style={field} /></Field>
      </div>
      <Field label={t('Justificatif')}><AttachmentInput value={f.attachmentPath} onChange={(p) => setF({ ...f, attachmentPath: p })} /></Field>
    </Modal>
  );
}
