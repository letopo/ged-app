// frontend/src/components/FormBuilder/Designer/ComponentPanel.jsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Heading1, Heading2, AlignLeft, Type, AlignJustify, Hash,
  DollarSign, Mail, Phone, Calendar, Clock, CheckSquare,
  Circle, ChevronDown, PenTool, Upload, Minus, Search, Stamp,
  Table2, CalendarRange, ListChecks, Building2, Users,
  Calculator, ListOrdered, Braces, GitMerge,
} from 'lucide-react';
import { FIELD_REGISTRY, FIELD_CATEGORIES } from '../../../store/formBuilderStore';

const FIELD_ICONS = {
  // Structure
  title:         Heading1,
  subtitle:      Heading2,
  paragraph:     AlignLeft,
  dynamictext:   Braces,
  separator:     Minus,
  // Saisie
  text:          Type,
  textarea:      AlignJustify,
  number:        Hash,
  currency:      DollarSign,
  email:         Mail,
  phone:         Phone,
  date:          Calendar,
  time:          Clock,
  daterange:     CalendarRange,
  serviceselect: Building2,
  userselect:    Users,
  // Choix
  checkbox:      CheckSquare,
  radio:         Circle,
  select:        ChevronDown,
  multicheck:    ListChecks,
  selectcond:    GitMerge,
  // Avancé
  table:         Table2,
  computed:      Calculator,
  autonum:       ListOrdered,
  signature:     PenTool,
  cachet:        Stamp,
  file:          Upload,
};

function FieldItem({ type, onDragStart }) {
  const { t } = useTranslation();
  const reg  = FIELD_REGISTRY[type];
  const Icon = FIELD_ICONS[type] || Type;
  const cat  = FIELD_CATEGORIES[reg.category];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('fieldType', type);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(type);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8, cursor: 'grab',
        border: '1.5px solid var(--border)', background: 'var(--bg)',
        transition: 'all .15s', userSelect: 'none',
        fontSize: 12, fontWeight: 500, color: 'var(--fg)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background    = `${cat.color}10`;
        e.currentTarget.style.borderColor   = cat.color;
        e.currentTarget.style.color         = cat.color;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background    = 'var(--bg)';
        e.currentTarget.style.borderColor   = 'var(--border)';
        e.currentTarget.style.color         = 'var(--fg)';
      }}
      title={t('Glisser pour ajouter : {{label}}', { label: t(reg.label) })}
    >
      <Icon size={13} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {t(reg.label)}
      </span>
    </div>
  );
}

export default function ComponentPanel({ onDragStart }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const grouped = Object.entries(
    Object.entries(FIELD_REGISTRY)
      .filter(([, reg]) => !search || reg.label.toLowerCase().includes(search.toLowerCase()))
      .reduce((acc, [type, reg]) => {
        if (!acc[reg.category]) acc[reg.category] = [];
        acc[reg.category].push(type);
        return acc;
      }, {})
  );

  return (
    <div style={{
      width: 220, flexShrink: 0,
      borderRight: '1.5px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 8px' }}>
          {t('Composants')}
        </p>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Rechercher...')}
            style={{
              width: '100%', padding: '6px 8px 6px 26px',
              border: '1.5px solid var(--border)', borderRadius: 6,
              fontSize: 12, background: 'var(--bg)', color: 'var(--fg)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {grouped.map(([category, types]) => {
          const catInfo = FIELD_CATEGORIES[category];
          return (
            <div key={category}>
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.6px', color: catInfo.color,
                margin: '0 0 5px', paddingLeft: 2,
              }}>
                {t(catInfo.label)}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {types.map(type => (
                  <FieldItem key={type} type={type} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}

        {grouped.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', textAlign: 'center', marginTop: 20 }}>
            {t('Aucun composant trouvé')}
          </p>
        )}
      </div>

      {/* Hint */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 10, color: 'var(--fg-muted)', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
          {t('Glisser un composant')}<br/>{t('dans la zone de conception')}
        </p>
      </div>
    </div>
  );
}
