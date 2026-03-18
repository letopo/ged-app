// frontend/src/components/SignatureFrame.jsx
// Composant partagé : cadre signature + cachet pour tous les templates PDF

import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const getImageUrl = (filePath) => filePath ? `${API_BASE}/${filePath}` : null;

const SignatureFrame = ({ label, signatureUrl, stampUrl, zoneIndex, height = '112px' }) => (
    <div className="flex flex-col items-center">
        <span className="font-bold text-sm mb-2">{label}</span>
        <div
            data-sig-zone={zoneIndex}
            className="w-full rounded flex flex-col"
            style={{
                minHeight: height,
                border: '1px dashed rgba(100, 100, 200, 0.18)',
                background: 'rgba(59, 130, 246, 0.015)',
            }}
        >
            {/* Moitié HAUTE : Cachet */}
            <div
                className="flex-1 flex items-center justify-center p-1"
                style={{ borderBottom: '1px dashed rgba(100,100,200,0.10)' }}
            >
                {stampUrl ? (
                    <img
                        src={stampUrl}
                        alt="Cachet"
                        crossOrigin="anonymous"
                        style={{ maxHeight: '52px', maxWidth: '90%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                ) : (
                    <span className="invisible text-xs">Cachet</span>
                )}
            </div>
            {/* Moitié BASSE : Signature */}
            <div className="flex-1 flex items-center justify-center p-1">
                {signatureUrl ? (
                    <img
                        src={signatureUrl}
                        alt="Signature"
                        crossOrigin="anonymous"
                        style={{ maxHeight: '52px', maxWidth: '92%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                ) : (
                    <span className="invisible text-xs">Signature</span>
                )}
            </div>
        </div>
        <div className="border-t border-black w-full mt-1 pt-1 text-xs italic text-gray-500 text-center">
            Signature
        </div>
    </div>
);

export default SignatureFrame;
