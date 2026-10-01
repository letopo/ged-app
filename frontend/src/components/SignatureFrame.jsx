// frontend/src/components/SignatureFrame.jsx
// Composant partagé : cadre signature + cachet pour tous les templates PDF
//
// Libellé du cadre :
//  - par défaut, il n'est PAS écrit dans le PDF : son emplacement (data-sig-label)
//    est réservé et mesuré, puis le serveur y inscrit à la soumission le titre et le
//    nom du signataire réellement choisi (backend utils/signatureLabels.js). À
//    l'écran, on affiche « Signataire N » pour situer le cadre ;
//  - fixedLabel : circuits imposés dont le cadre désigne un rôle dans le document
//    (ex. « Visa Bénéficiaire ») — le libellé est écrit tel quel dans le PDF.

import React from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const getImageUrl = (filePath) => filePath ? `${API_BASE}/${filePath}` : null;

const SignatureFrame = ({ label, signatureUrl, stampUrl, zoneIndex, height = '112px', fixedLabel = false }) => {
    const { t } = useTranslation();
    return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {fixedLabel ? (
            <span style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{label}</span>
        ) : (
            // Emplacement du titre du signataire (2 lignes : titre + nom), rempli à la soumission
            <div data-sig-label={zoneIndex} style={{ width: '100%', height: 46, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span data-sig-label-hint style={{ fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>
                    {t('Signataire {{n}} — titre ajouté à la soumission', { n: zoneIndex })}
                </span>
            </div>
        )}
        <div
            data-sig-zone={zoneIndex}
            style={{
                width: '100%',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                minHeight: height,
                border: '1px dashed rgba(100, 100, 200, 0.18)',
                background: 'rgba(59, 130, 246, 0.015)',
            }}
        >
            {/* Moitié HAUTE : Cachet */}
            <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderBottom: '1px dashed rgba(100,100,200,0.10)' }}
            >
                {stampUrl ? (
                    <img
                        src={stampUrl}
                        alt="Cachet"
                        crossOrigin="anonymous"
                        style={{ maxHeight: '52px', maxWidth: '90%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                ) : (
                    <span style={{ visibility: 'hidden', fontSize: 12 }}>Cachet</span>
                )}
            </div>
            {/* Moitié BASSE : Signature */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                {signatureUrl ? (
                    <img
                        src={signatureUrl}
                        alt="Signature"
                        crossOrigin="anonymous"
                        style={{ maxHeight: '52px', maxWidth: '92%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                ) : (
                    <span style={{ visibility: 'hidden', fontSize: 12 }}>Signature</span>
                )}
            </div>
        </div>
        <div style={{ borderTop: '1px solid #000', width: '100%', marginTop: 4, paddingTop: 4, fontSize: 12, fontStyle: 'italic', color: '#6b7280', textAlign: 'center' }}>
            Signature
        </div>
    </div>
    );
};

export default SignatureFrame;
