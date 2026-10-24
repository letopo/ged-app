// frontend/src/pages/SignerPage.jsx
// /signer/:token — ouvert sur la tablette ou le téléphone du patient (QR code
// affiché sur le PC de l'agent). Sans connexion : le jeton suffit.
import React from 'react';
import { useParams } from 'react-router-dom';
import RemoteSigner from '../components/RemoteSigner';

export default function SignerPage() {
  const { token } = useParams();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <RemoteSigner token={token} />
    </div>
  );
}
