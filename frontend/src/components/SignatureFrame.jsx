// frontend/src/components/SignatureFrame.jsx
// Composant partagé : cadre signature + cachet pour tous les templates PDF

import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const getImageUrl = (filePath) => filePath ? `${API_BASE}/${filePath}` : null;

const SignatureFrame = ({ label, signatureUrl, stampUrl, zoneIndex, height = '112px' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{label}</span>
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

export default SignatureFrame;
