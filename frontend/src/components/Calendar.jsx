// frontend/src/components/Calendar.jsx
import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import { Calendar as CalendarIcon, Flag, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { isHoliday, getHolidayColor } from '../utils/cameroonHolidays';

// Permission dot colors (CSS-var based)
const DOT_COLORS = ['#1B3A6B','#1A7A4A','#8A2BE2','#E07B00','#C0392B','#1557A0','#00897B','#D32F2F'];

export default function Calendar({ month: initialMonth, year: initialYear }) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear,  setCurrentYear]  = useState(initialYear);
  const [permissions,  setPermissions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const month = currentMonth;
  const year  = currentYear;

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const goToToday = () => { const n = new Date(); setCurrentMonth(n.getMonth()); setCurrentYear(n.getFullYear()); };

  useEffect(() => { loadPermissions(); }, [month, year]);

  const loadPermissions = async () => {
    try {
      setLoading(true); setError(null);
      const startDate = new Date(year, month, 1);
      const endDate   = new Date(year, month + 1, 0);
      const response = await calendarAPI.getPermissions(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      );
      setPermissions(response.data.data || []);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = () => new Date(year, month, 1).getDay();
  const getMonthName = () => new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const isSunday = (day) => new Date(year, month, day).getDay() === 0;

  const isDateInRange = (day, perm) => {
    try {
      const cur   = new Date(year, month, day);
      const start = new Date(perm.dateDebut);
      const end   = new Date(perm.dateFin);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      cur.setHours(0,0,0,0); start.setHours(0,0,0,0); end.setHours(0,0,0,0);
      return cur >= start && cur <= end;
    } catch { return false; }
  };

  const getPermissionsForDay = (day) => permissions.filter(p => isDateInRange(day, p));
  const getRequesterName = (perm) => {
    if (perm.metadata?.nomsDemandeur) return perm.metadata.nomsDemandeur;
    if (perm.uploadedBy) return `${perm.uploadedBy.firstName || ''} ${perm.uploadedBy.lastName || ''}`.trim();
    return 'N/A';
  };

  const today = new Date();

  const renderDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay    = getFirstDayOfMonth();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`e${i}`} style={{ height: 64, background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayPerms = getPermissionsForDay(day);
      const isToday  = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const holiday  = isHoliday(year, month, day);
      const isSun    = isSunday(day);

      let bg     = 'var(--surface)';
      let border = '1px solid var(--border)';
      let numColor = 'var(--fg)';

      if (isToday) {
        bg = 'var(--brand-soft)'; border = '2px solid var(--brand)'; numColor = 'var(--brand)';
      } else if (holiday) {
        const isCivil = holiday.type === 'civil';
        bg = isCivil ? '#FFF1F0' : '#F0FFF4';
        border = `1px solid ${isCivil ? '#FFCCC7' : '#B7EB8F'}`;
        numColor = 'var(--danger)';
      } else if (isSun) {
        bg = '#FFF2F0'; border = '1px solid #FFCCC7'; numColor = 'var(--danger)';
      }

      days.push(
        <div
          key={day}
          style={{
            height: 64, padding: '4px 5px',
            background: bg, border, position: 'relative',
            transition: 'box-shadow .12s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: numColor }}>{day}</span>
            {holiday && <Flag size={9} color="var(--danger)" title={holiday.title} />}
          </div>
          {holiday && (
            <div style={{ fontSize: 8, color: 'var(--danger)', fontWeight: 600, lineHeight: 1.2, marginTop: 1 }}>
              🇨🇲 {holiday.title}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
            {dayPerms.map((perm, idx) => (
              <div
                key={`${perm.id}-${idx}`}
                title={`${getRequesterName(perm)} — ${perm.title || 'Permission'}`}
                style={{ width: 6, height: 6, borderRadius: '50%', background: DOT_COLORS[idx % DOT_COLORS.length] }}
              />
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const navBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 'var(--radius-2)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--fg-muted)', cursor: 'pointer', transition: 'background .12s',
  };

  if (error) return (
    <div style={{ padding: 16, fontSize: 12, color: 'var(--danger)' }}>Erreur de chargement du calendrier</div>
  );

  return (
    <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button style={navBtn} onClick={goToPrevMonth}><ChevronLeft size={14} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarIcon size={14} color="var(--brand)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', textTransform: 'capitalize' }}>
            {getMonthName()}
          </span>
          <button
            onClick={goToToday}
            style={{
              height: 18, padding: '0 6px', borderRadius: 999, border: '1px solid var(--brand)',
              background: 'var(--brand-soft)', color: 'var(--brand)',
              fontSize: 10, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Auj.
          </button>
        </div>

        <button style={navBtn} onClick={goToNextMonth}><ChevronRight size={14} /></button>
      </div>

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 600, padding: '3px 0',
            color: i === 0 ? 'var(--danger)' : 'var(--fg-subtle)',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader size={20} color="var(--fg-subtle)" className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {renderDays()}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', marginBottom: permissions.length ? 8 : 0 }}>
          {[
            { bg: '#FFF1F0', border: '#FFCCC7', label: 'Jours fériés civils' },
            { bg: '#F0FFF4', border: '#B7EB8F', label: 'Fête Nationale' },
            { bg: '#F9F0FF', border: '#D3ADF7', label: 'Fériés chrétiens' },
            { bg: '#E6FFFB', border: '#87E8DE', label: 'Fériés musulmans' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.bg, border: `1px solid ${item.border}`, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {permissions.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 4 }}>
              Permissions en cours :
            </div>
            {permissions.slice(0, 3).map((perm, idx) => (
              <div key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: DOT_COLORS[idx % DOT_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getRequesterName(perm)} — {new Date(perm.dateDebut).toLocaleDateString('fr-FR')} au {new Date(perm.dateFin).toLocaleDateString('fr-FR')}
                </span>
              </div>
            ))}
            {permissions.length > 3 && (
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
                … et {permissions.length - 3} autre(s)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
