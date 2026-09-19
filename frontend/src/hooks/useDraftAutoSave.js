// frontend/src/hooks/useDraftAutoSave.js
import { useState, useEffect, useRef, useCallback } from 'react';

const DRAFT_PREFIX = 'ged-draft-';
const AUTO_SAVE_DELAY = 5000; // 5 secondes

export default function useDraftAutoSave(templateName, formData, setFormData, initialState) {
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved | restored
  const [hasDraft, setHasDraft] = useState(false);
  const prevDataRef = useRef(null);
  const timerRef = useRef(null);
  const draftKey = `${DRAFT_PREFIX}${templateName}`;

  // Verifier si un brouillon existe au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data && parsed.timestamp) {
          setHasDraft(true);
        }
      }
    } catch (e) { /* ignore */ }
  }, [draftKey]);

  // Restaurer le brouillon
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data) {
          setFormData(prev => ({ ...prev, ...parsed.data }));
          setDraftStatus('restored');
          setHasDraft(false);
          setTimeout(() => setDraftStatus('idle'), 2000);
        }
      }
    } catch (e) {
      console.warn('Erreur restauration brouillon:', e);
    }
  }, [draftKey, setFormData]);

  // Ignorer le brouillon
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
  }, []);

  // Auto-save avec debounce
  useEffect(() => {
    if (!templateName || !formData) return;

    // Ne pas sauvegarder si les donnees sont identiques a l'etat initial
    const isDefault = JSON.stringify(formData) === JSON.stringify(initialState);
    if (isDefault) return;

    // Ne pas sauvegarder si rien n'a change
    const currentJson = JSON.stringify(formData);
    if (prevDataRef.current === currentJson) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          data: formData,
          timestamp: Date.now(),
          templateName,
        }));
        prevDataRef.current = currentJson;
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus('idle'), 1500);
      } catch (e) {
        console.warn('Erreur sauvegarde brouillon:', e);
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timerRef.current);
  }, [formData, templateName, draftKey, initialState]);

  // Supprimer le brouillon (apres soumission)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    prevDataRef.current = null;
    setDraftStatus('idle');
    setHasDraft(false);
  }, [draftKey]);

  // Obtenir l'age du brouillon
  const getDraftAge = useCallback(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const mins = Math.floor((Date.now() - parsed.timestamp) / 60000);
        if (mins < 1) return 'A l\'instant';
        if (mins < 60) return `Il y a ${mins} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Il y a ${hrs}h`;
        return `Il y a ${Math.floor(hrs / 24)}j`;
      }
    } catch (e) { /* ignore */ }
    return null;
  }, [draftKey]);

  return {
    draftStatus,
    hasDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
    getDraftAge,
  };
}
