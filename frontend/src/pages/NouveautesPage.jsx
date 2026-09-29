// frontend/src/pages/NouveautesPage.jsx — historique des notes « Nouveautés »
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import RELEASE_NOTES from '../releaseNotes';
import { isNoteForUser } from '../components/ReleaseNotes';

export default function NouveautesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // Toutes les notes destinées à l'utilisateur (vues ou non), regroupées par date, plus récentes d'abord
  const byDate = useMemo(() => {
    const groups = {};
    RELEASE_NOTES.filter(n => isNoteForUser(n, user, null)).forEach(n => { (groups[n.date] ||= []).push(n); });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [user]);

  const scopeLabel = (target) =>
    target === 'app' ? t("Toute l'application") : target.startsWith('form:') ? t('Formulaire') : t('Page');

  return (
    <div className="stats-page animate-pageFade" style={{ maxWidth: 760 }}>
      <div className="stats-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>{t('Nouveautés')}</h1>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{t('Les améliorations et ajustements apportés à l’application')}</div>
        </div>
      </div>

      {byDate.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13, padding: '48px 0' }}>{t('Aucune nouveauté pour le moment.')}</div>
      ) : byDate.map(([date, notes]) => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            {new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language || 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(note => (
              <div key={note.id} className="ged-card" style={{ padding: '14px 16px', display: 'flex', gap: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-2)', background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{t(note.title)}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-3)', color: 'var(--fg-muted)' }}>{scopeLabel(note.target)}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                    {note.items.map((it, i) => <li key={i}>{t(it)}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
