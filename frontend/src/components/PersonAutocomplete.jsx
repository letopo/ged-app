// frontend/src/components/PersonAutocomplete.jsx
// Champ de recherche/sélection d'une personne (Employee + User fusionnés, dédupliqués),
// optionnellement filtré par pôle (serviceId). Utilisé pour missionnaire/conducteur sur un OM.
import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI } from '../services/api';

const inputStyle = {
  width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-2)',
  border: '1.5px solid var(--border)', background: 'var(--surface)',
  color: 'var(--fg)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

export default function PersonAutocomplete({ value, onSelect, serviceId, placeholder, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    const t = setTimeout(() => {
      employeesAPI.getMissionCandidates({ serviceId: serviceId || undefined, q: query || undefined })
        .then(r => setResults(r.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, serviceId, open]);

  useEffect(() => {
    const onClickOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (candidate) => {
    setQuery(candidate.label);
    setOpen(false);
    onSelect(candidate);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect({ id: null, label: e.target.value, source: null });
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        style={inputStyle}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          marginTop: 2, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-2)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--fg-muted)' }}>Recherche…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--fg-muted)' }}>Aucun résultat</div>
          ) : results.map(c => (
            <div
              key={`${c.source}-${c.id}`}
              onClick={() => pick(c)}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--fg)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
