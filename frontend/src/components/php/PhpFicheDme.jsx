// frontend/src/components/php/PhpFicheDme.jsx
// Fiche Patient PHP › « Fiche DME » : la ou les fiches du DME retrouvées pour
// l'agent (matricule, compte Sage, nom…), le lien enregistré, et les actions
// « C'est lui » / « Ce n'est pas lui » / n° de dossier saisi.
import { useCallback, useEffect, useState } from 'react';
import { Loader, Database, RefreshCw } from 'lucide-react';
import { phpPatientAPI } from '../../services/phpService';
import { FichesDme } from './PHPSuiviDme';

export default function PhpFicheDme({ patientId, canWrite, t = (s) => s }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await phpPatientAPI.rechercheDme(patientId)).data); }
    catch (err) { setData({ erreur: err.response?.data?.message || 'DME injoignable.' }); }
    finally { setLoading(false); }
  }, [patientId]);
  useEffect(() => { setData(null); load(); }, [load]);

  if (data?.disponible === false) return null; // DME non branché : rien à montrer
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Database size={13} style={{ color: 'var(--brand)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)', margin: 0, flex: 1 }}>{t('Fiche DME')}</h3>
        <button type="button" onClick={load} disabled={loading} title={t('Relancer la recherche')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 2 }}>
          {loading ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        </button>
      </div>
      {!data ? (
        <p className="text-xs" style={{ margin: 0, color: 'var(--fg-subtle)' }}>{t('Recherche dans le DME…')}</p>
      ) : data.erreur ? (
        <p className="text-xs" style={{ margin: 0, color: 'var(--warning)' }}>{data.erreur}</p>
      ) : (
        <>
          {!data.trouve && (
            <p className="text-xs" style={{ margin: '0 0 6px', color: 'var(--fg-muted)' }}>
              {t('Aucune fiche du DME ne correspond (ni le matricule, ni le nom, ni le compte Sage).')}
            </p>
          )}
          <FichesDme suivi={data} canWrite={canWrite} onChange={load} />
        </>
      )}
    </div>
  );
}
