// frontend/src/components/RemoteSigner.jsx
// Écran du patient sur la tablette du guichet : il voit le document (cadre de
// signature mis en évidence), touche « Signer », signe, et la signature part
// en direct vers le PC de l'agent, qui vérifie l'aperçu puis l'appose.
// Utilisé par le lien / QR code (/signer/:jeton, sans connexion) et par la
// borne (/borne-signature). Aucun accès au reste de la GED.
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader, PenLine, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getFileBaseUrl } from '../services/api';
import {
  PageView, SignatureFrame, SignPadScreen, useDocumentPages, usePageWidth, scrollToFrameIn, signButtonStyle,
} from './SignatureSession';

const publicUrl = (token, suffix = '') => `${getFileBaseUrl()}/signature-public/${encodeURIComponent(token)}${suffix}`;

export default function RemoteSigner({ token, onFinished }) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('read'); // read | pad | sending | done
  const isPdf = info ? (info.fileType === 'application/pdf' || !/^image\//.test(info.fileType || '')) : true;
  const { pdf, image, pages, loadError } = useDocumentPages(info ? publicUrl(token, '/file') : null, isPdf);
  const width = usePageWidth(scrollRef);

  useEffect(() => {
    let alive = true;
    setInfo(null); setError(null); setStep('read');
    fetch(publicUrl(token))
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || t('Cette demande de signature a expiré ou a été annulée.'));
        if (alive) setInfo(j.data);
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [token, t]);

  // L'agent peut annuler depuis le PC : on vérifie de temps en temps
  useEffect(() => {
    if (!info || step === 'done') return undefined;
    const id = setInterval(() => {
      fetch(publicUrl(token)).then((r) => {
        if (r.status === 404) setError(t('Cette demande de signature a expiré ou a été annulée.'));
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [info, step, token, t]);

  // Montre d'emblée l'endroit où signer
  useEffect(() => {
    if (!info || !pages.length || !width) return undefined;
    const id = setTimeout(() => scrollToFrameIn(scrollRef.current, info.placement), 150);
    return () => clearTimeout(id);
  }, [info, pages.length, width]);

  // Fin : la borne revient en attente après quelques secondes
  useEffect(() => {
    if (step !== 'done' || !onFinished) return undefined;
    const id = setTimeout(onFinished, 5000);
    return () => clearTimeout(id);
  }, [step, onFinished]);

  const send = async ({ png, pointerType }) => {
    setStep('sending');
    try {
      const r = await fetch(publicUrl(token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: png, pointerType }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || t('Erreur lors de l\'envoi de la signature.'));
      setStep('done');
    } catch (err) {
      setError(err.message);
    }
  };

  const center = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: '#f4f5f8' };

  if (error) {
    return (
      <div style={center}>
        <AlertTriangle size={44} color="#d97706" />
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2a52', maxWidth: 480 }}>{error}</div>
        {onFinished && <button style={signButtonStyle(false)} onClick={onFinished}>{t('Fermer')}</button>}
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={center}>
        <CheckCircle2 size={64} color="#16a34a" />
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1f2a52' }}>{t('Merci !')}</div>
        <div style={{ fontSize: 16, color: '#5b6275', maxWidth: 460 }}>{t('Votre signature a été transmise. Vous pouvez rendre la tablette.')}</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#3d4146' }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e3e6ec', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1f2a52' }}>{t('Document à signer')}</div>
        <div style={{ fontSize: 12, color: '#5b6275', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {info?.title}{info?.signerName ? ` · ${info.signerName}` : ''}
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 12, position: 'relative', WebkitOverflowScrolling: 'touch' }}>
        {info && width > 0 && pages.map((p) => (
          <PageView key={p.number} pdf={pdf} image={image} info={p} width={width} root={scrollRef.current}>
            {info.placement.page === p.number && <SignatureFrame frame={info.placement} editable={false} />}
          </PageView>
        ))}
        {(!info || (!pages.length && !loadError)) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#ddd', fontSize: 14, paddingTop: 80 }}>
            <Loader size={26} className="animate-spin" />{t('Chargement du document…')}
          </div>
        )}
        {loadError && <div style={{ color: '#eee', fontSize: 14, paddingTop: 80, textAlign: 'center' }}>{t('Impossible d\'afficher le document.')}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: '#fff', borderTop: '1px solid #e3e6ec', flexShrink: 0 }}>
        <div style={{ flex: '1 1 200px', fontSize: 14, color: '#5b6275' }}>{t('Lisez le document, puis touchez « Signer ».')}</div>
        <button style={{ ...signButtonStyle(true, !pages.length), height: 52, padding: '0 28px', fontSize: 17 }} disabled={!pages.length} onClick={() => setStep('pad')}>
          <PenLine size={20} /> {t('Signer')}
        </button>
      </div>

      {(step === 'pad' || step === 'sending') && (
        <SignPadScreen signerName={info?.signerName || ''} busy={step === 'sending'} onBack={() => setStep('read')} onValidate={send} />
      )}
    </div>
  );
}
