// frontend/src/components/ReleaseNotes.jsx
// « Nouveautés » façon iOS : une fenêtre à l'ouverture de l'application pour les
// nouveautés générales, une bulle à la 1re ouverture d'une page ou d'un
// formulaire pour les nouveautés qui le concernent. Chaque note n'apparaît
// qu'une fois par utilisateur (état lu/écrit via /api/auth/release-notes).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { authAPI, releaseNotesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import RELEASE_NOTES from '../releaseNotes';

const ReleaseNotesContext = createContext({ registerForm: () => () => {}, notes: RELEASE_NOTES, reloadNotes: () => {} });

const isAdminUser = (user) => ['admin', 'superadmin'].includes(user?.role);

// Notes rédigées dans l'application : même format que src/releaseNotes.js,
// l'audience 'admins' devient un filtre d'accès
const fromDb = (note) => ({ ...note, access: note.audience === 'admins' ? isAdminUser : undefined });

// Notes du code + notes rédigées, de la plus ancienne à la plus récente
const mergeNotes = (dbNotes) =>
  [...RELEASE_NOTES, ...dbNotes.map(fromDb)].sort((a, b) => a.date.localeCompare(b.date));

// Une note est-elle destinée à cet utilisateur ? (hors « déjà vue »)
export const isNoteForUser = (note, user, createdAt) => {
  if (note.access && !note.access(user)) return false;
  // Un compte créé après la note ne reçoit pas l'historique des nouveautés
  if (createdAt && new Date(`${note.date}T23:59:59`) < new Date(createdAt)) return false;
  return true;
};

const matchesRoute = (target, pathname) =>
  target.startsWith('/') && (pathname === target || pathname.startsWith(target + '/'));

const fmtDate = (d, lang) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(lang || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function ReleaseNotesProvider({ children }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [state, setState] = useState(null);           // { seen: Set, createdAt }
  const [forms, setForms] = useState([]);             // clés des formulaires actuellement ouverts
  const [bubble, setBubble] = useState(null);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [notes, setNotes] = useState(RELEASE_NOTES);
  const bubbleRef = useRef(null);

  const reloadNotes = useCallback(() => {
    releaseNotesAPI.list()
      .then(res => setNotes(mergeNotes(res.data.notes || [])))
      .catch(() => setNotes(RELEASE_NOTES)); // serveur sans la table : notes du code seulement
  }, []);

  // État « déjà vu » lu depuis la base à chaque connexion
  useEffect(() => {
    setState(null); setModalDismissed(false); setBubble(null);
    if (!user?.id) return;
    reloadNotes();
    let cancelled = false;
    authAPI.getReleaseNotes()
      .then(res => { if (!cancelled) setState({ seen: new Set(res.data.seen || []), createdAt: res.data.createdAt }); })
      .catch(() => { /* hors ligne / backend ancien : pas de nouveautés plutôt qu'une erreur */ });
    return () => { cancelled = true; };
  }, [user?.id, reloadNotes]);

  const eligible = useCallback(
    (note) => !!state && !state.seen.has(note.id) && isNoteForUser(note, user, state.createdAt),
    [state, user],
  );

  const markSeen = useCallback((ids) => {
    if (!ids.length) return;
    setState(s => s && ({ ...s, seen: new Set([...s.seen, ...ids]) }));
    authAPI.markReleaseNotesSeen(ids).catch(() => { /* réessayé à la prochaine ouverture */ });
  }, []);

  const appNotes = useMemo(() => notes.filter(n => n.target === 'app' && eligible(n)), [notes, eligible]);
  const showModal = appNotes.length > 0 && !modalDismissed;

  // Bulle de la page / du formulaire courant (après la fenêtre générale)
  useEffect(() => {
    if (!state || showModal) return;
    const note = notes.find(n => eligible(n) && (
      matchesRoute(n.target, location.pathname) ||
      (n.target.startsWith('form:') && forms.includes(n.target.slice(5)))
    )) || null;
    // Bulle affichée puis écran quitté sans la fermer : elle a été vue quand même
    if (bubbleRef.current && bubbleRef.current.id !== note?.id) markSeen([bubbleRef.current.id]);
    bubbleRef.current = note;
    setBubble(note);
  }, [state, showModal, location.pathname, forms, notes, eligible, markSeen]);

  const registerForm = useCallback((key) => {
    setForms(f => [...f, key]);
    return () => setForms(f => { const i = f.indexOf(key); return i < 0 ? f : [...f.slice(0, i), ...f.slice(i + 1)]; });
  }, []);

  const closeModal = () => { markSeen(appNotes.map(n => n.id)); setModalDismissed(true); };
  const closeBubble = () => { if (bubble) markSeen([bubble.id]); bubbleRef.current = null; setBubble(null); };

  return (
    <ReleaseNotesContext.Provider value={{ registerForm, notes, reloadNotes }}>
      {children}

      {showModal && ReactDOM.createPortal(
        <div className="rn-overlay" role="dialog" aria-modal="true" aria-labelledby="rn-title">
          <div className="rn-modal">
            <div className="rn-modal-head">
              <div className="rn-icon"><Sparkles size={20} /></div>
              <h2 id="rn-title">{t('Nouveautés')}</h2>
              <p>{t('Ce qui a changé depuis votre dernière visite')}</p>
            </div>
            <div className="rn-modal-body">
              {appNotes.map(note => (
                <section key={note.id} className="rn-note">
                  <div className="rn-note-date">{fmtDate(note.date, i18n.language)}</div>
                  <h3>{t(note.title)}</h3>
                  <ul>{note.items.map((it, i) => <li key={i}>{t(it)}</li>)}</ul>
                </section>
              ))}
            </div>
            <div className="rn-modal-foot">
              <Link to="/nouveautes" onClick={closeModal} className="rn-link">{t('Toutes les nouveautés')}</Link>
              <button type="button" onClick={closeModal} className="rn-btn" autoFocus>{t("J'ai compris")}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {!showModal && bubble && ReactDOM.createPortal(
        <div className="rn-bubble" role="status">
          <div className="rn-bubble-icon"><Sparkles size={15} /></div>
          <div className="rn-bubble-text">
            <div className="rn-bubble-title">{t('Nouveau')} · {t(bubble.title)}</div>
            {bubble.items.map((it, i) => <p key={i}>{t(it)}</p>)}
            <button type="button" onClick={closeBubble} className="rn-bubble-ok">{t("J'ai compris")}</button>
          </div>
          <button type="button" onClick={closeBubble} className="rn-bubble-close" aria-label={t('Fermer')}><X size={14} /></button>
        </div>,
        document.body,
      )}
    </ReleaseNotesContext.Provider>
  );
}

// Toutes les notes (code + rédigées) et rechargement après rédaction
export function useReleaseNotes() {
  const { notes, reloadNotes } = useContext(ReleaseNotesContext);
  return { notes, reloadNotes };
}

// À appeler dans un formulaire : affiche (une fois) les notes 'form:<clé>'.
export function useFeatureNote(key) {
  const { registerForm } = useContext(ReleaseNotesContext);
  useEffect(() => registerForm(key), [key, registerForm]);
}
