// frontend/src/utils/passkeys.js
// Connexion sans mot de passe (passkeys / WebAuthn) : empreinte, Face ID, ou
// code PIN du téléphone ou de Windows Hello. Facultative ; le mot de passe
// reste toujours valable.
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { authAPI } from '../services/api';

const IP_HOST = /^\d{1,3}(\.\d{1,3}){3}$|^\[[0-9a-f:]+\]$/i;

/**
 * Ce que permet ce navigateur, sur cette adresse :
 *  - supported : le navigateur sait faire (sinon on n'affiche rien) ;
 *  - needsDomain : GED ouverte par une adresse IP (WebAuthn exige un nom).
 */
export function passkeySupport() {
  const supported = typeof window !== 'undefined' && browserSupportsWebAuthn();
  return { supported, needsDomain: supported && IP_HOST.test(window.location.hostname) };
}

/** Empreinte, visage ou code PIN disponible sur cet appareil même. */
export async function hasDeviceUnlock() {
  try {
    return await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.() === true;
  } catch {
    return false;
  }
}

// L'utilisateur a fermé la fenêtre de l'appareil (ou elle a expiré) : pas une erreur à afficher
export const isCancelled = (err) => err?.name === 'NotAllowedError' || err?.name === 'AbortError';

/** Connexion : renvoie la réponse de l'API ({ token, user }). */
export async function loginWithPasskey({ remember = false } = {}) {
  const { data } = await authAPI.passkeyLoginOptions();
  const response = await startAuthentication({ optionsJSON: data.options });
  return (await authAPI.passkeyLoginVerify({ challengeId: data.challengeId, response, remember })).data;
}

/** Activer sur cet appareil (utilisateur connecté). */
export async function registerThisDevice() {
  const { data } = await authAPI.passkeyRegisterOptions();
  const response = await startRegistration({ optionsJSON: data.options });
  return (await authAPI.passkeyRegisterVerify({ challengeId: data.challengeId, response })).data;
}
