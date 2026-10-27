// frontend/src/pages/templates/BonPriseEnCharge.jsx
// Bon de prise en charge (BPC) du personnel, saisie du médecin du travail :
// malade, consultation ou hospitalisation (+ date), diagnostic d'entrée.
// Le bon A5 est dessiné par le serveur (backend utils/bonPriseEnCharge.js) ;
// le RH complète l'assuré à son étape, puis le DG vise et le bon part à l'accueil.
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo-ordre-malte.png';

const input = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)', border: '1.5px solid var(--border)',
  background: 'var(--surface)', color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 4 };

// Aperçu du bon (fond blanc, comme le papier)
const row = { display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13, color: '#111', margin: '7px 0' };
const dots = { flex: 1, borderBottom: '1px dotted #777', minHeight: 16, color: '#0d2a8c', fontWeight: 700, paddingLeft: 4 };
const pending = { ...dots, color: '#999', fontWeight: 400, fontStyle: 'italic', fontSize: 11 };
const box = (on) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, border: '1px solid #111', fontSize: 10, color: '#0d2a8c', fontWeight: 700 });

const frDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function BonPriseEnCharge({ formData, setFormData }) {
  const { t } = useTranslation();
  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));
  const hosp = formData.typeSoins === 'hospitalisation';
  const rhLater = t('complété par les RH');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
          {t('Circuit : Médecin du travail (visa) → RH (complète l’assuré) → DG (visa) → envoi à l’accueil pour l’ouverture du BPC dans Sage.')}
        </p>
        <label><span style={label}>{t('Nom du malade')} *</span>
          <input style={input} value={formData.nomMalade} maxLength={120} onChange={e => set('nomMalade', e.target.value)} />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {[['consultation', 'Consultation externe et soins externes'], ['hospitalisation', 'Hospitalisation']].map(([key, text]) => (
            <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="bpc-type" checked={formData.typeSoins === key} onChange={() => set('typeSoins', key)} style={{ accentColor: 'var(--brand)' }} />
              {t(text)}
            </label>
          ))}
        </div>
        <label style={{ maxWidth: 220 }}><span style={label}>{hosp ? t('Date d’hospitalisation') : t('Date de la consultation')} *</span>
          <input type="date" style={input} value={formData.dateSoins} onChange={e => set('dateSoins', e.target.value)} />
        </label>
        <label><span style={label}>{t("Diagnostic d'entrée")} *</span>
          <input style={input} value={formData.diagnostic} maxLength={200} onChange={e => set('diagnostic', e.target.value)} />
        </label>
      </div>

      {/* Aperçu A5 paysage */}
      <div style={{ background: '#fff', color: '#111', border: '1px solid #ddd', borderRadius: 4, padding: '18px 22px', aspectRatio: '1.414', maxWidth: 720, width: '100%', margin: '0 auto', boxSizing: 'border-box', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <img src={logo} alt="" style={{ width: '34%', minWidth: 120 }} />
          <div style={{ textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#333', lineHeight: 1.35 }}>
            HÔPITAL SAINT-JEAN DE MALTE<br />BP.: 56 NJOMBE - CAMEROUN<br />Tél.: (237) 697 09 29 92<br />233 21 10 22
          </div>
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'Times New Roman, serif', fontWeight: 700, fontSize: 'clamp(16px, 3.4vw, 24px)', margin: '4px 0 8px' }}>BON DE PRISE EN CHARGE</div>
        <div style={row}>Nom de l'assuré <span style={pending}>{rhLater}</span></div>
        <div style={row}>Entreprise <span style={pending}>{rhLater}</span> Secteur <span style={pending} /> Matricule <span style={pending} /></div>
        <div style={row}>Nom du malade <span style={dots}>{formData.nomMalade}</span></div>
        <div style={{ ...row, gap: 14, flexWrap: 'wrap' }}>Lien de filiation : {['Salarié', 'Conjoint', 'Enfants', 'Parents'].map(x => <span key={x} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><span style={box(false)} />{x}</span>)}</div>
        <div style={row}><span style={box(!hosp)}>{!hosp && formData.typeSoins ? 'X' : ''}</span> Consultation externe et soins externes Date <span style={dots}>{!hosp ? frDate(formData.dateSoins) : ''}</span></div>
        <div style={row}><span style={box(hosp)}>{hosp ? 'X' : ''}</span> Hospitalisation Date <span style={dots}>{hosp ? frDate(formData.dateSoins) : ''}</span></div>
        <div style={row}>Diagnostic d'entrée <span style={dots}>{formData.diagnostic}</span></div>
        <div style={{ ...row, marginLeft: '50%' }}>Njombé le <span style={dots}>{new Date().toLocaleDateString('fr-FR')}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 12, padding: '0 14% 0 12%' }}><span>VISA DG</span><span>VISA MÉDECIN</span></div>
      </div>
    </div>
  );
}
