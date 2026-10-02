// frontend/src/components/ValidationFlowChart.jsx
// Schéma du flux de validation (diagramme de Sankey) construit sur les vrais
// circuits : les documents traversent les étapes de gauche à droite ; à chaque
// étape, une partie continue vers l'étape suivante et le reste sort vers une
// issue (validés, en cours, expirés, rejetés). Épaisseur = nombre de documents.
// Données : GET /api/workflows/flow-stats (backend workflowFlowController).
// Sur petit écran, le même flux est présenté étape par étape (barres empilées).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';

export const OUTCOMES = [
  { key: 'completed',  outcome: 'approved',    label: 'Validés',  color: 'var(--success)' },
  { key: 'inProgress', outcome: 'in_progress', label: 'En cours', color: 'var(--warning)' },
  { key: 'expired',    outcome: 'expired',     label: 'Expirés',  color: '#94a3b8' },
  { key: 'rejected',   outcome: 'rejected',    label: 'Rejetés',  color: 'var(--danger)' },
];
const FLOW_COLOR = 'var(--brand)';

// Durée lisible (min, h, j), nombres au format de la langue (6,3 h en français)
export const formatHours = (h, t) => {
  if (h == null) return '—';
  const num = (v, d) => Number(v).toLocaleString(i18n.language || 'fr', { maximumFractionDigits: d });
  if (h < 1) return t('{{n}} min', { n: Math.max(1, Math.round(h * 60)) });
  if (h < 48) return t('{{n}} h', { n: num(h, h < 10 ? 1 : 0) });
  return t('{{n}} j', { n: num(h / 24, 1) });
};
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// Ruban courbe entre deux segments verticaux (x0 : [y0, y0+h0] → x1 : [y1, y1+h1])
const ribbon = (x0, y0, h0, x1, y1, h1) => {
  const mx = (x0 + x1) / 2;
  return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h1} C${mx},${y1 + h1} ${mx},${y0 + h0} ${x0},${y0 + h0} Z`;
};

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export default function ValidationFlowChart({ stages = [], totals }) {
  const { t } = useTranslation();
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const [hover, setHover] = useState(null); // { id, x, y, title, lines }
  const total = totals?.documents || 0;

  if (!total || !stages.length) {
    return (
      <div ref={boxRef} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
        {t('Aucun circuit de validation sur la période.')}
      </div>
    );
  }
  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      {width > 0 && width < 640
        ? <FlowList stages={stages} totals={totals} t={t} />
        : width > 0 && <FlowSankey stages={stages} totals={totals} width={width} t={t} hover={hover} setHover={setHover} />}
    </div>
  );
}

// ── Grand écran : diagramme de Sankey ───────────────────────────────────────
function FlowSankey({ stages, totals, width, t, hover, setHover }) {
  const total = totals.documents;
  // Disposition « en escalier » : dans chaque étape, de haut en bas, les documents
  // validés (fin de circuit), puis ceux qui passent à l'étape suivante, puis les
  // autres issues. L'étape suivante commence juste sous les validés de la
  // précédente : les rubans « validés » et « étape suivante » sont horizontaux,
  // les autres issues partent vers le bas — quasiment aucun croisement.
  const layout = useMemo(() => {
    const W = width;
    const nodeW = 12;
    const top = 50;                       // en-têtes des étapes au-dessus
    const labelRight = 150;               // libellés des issues
    const outcomeGap = 22;
    const k = 300 / total;                // px par document
    const draw = (v) => (v > 0 ? Math.max(1.5, v) : 0);

    const outs = OUTCOMES.filter(o => (totals[o.outcome] || 0) > 0);
    const stageX0 = 8;
    const outX = W - labelRight - nodeW;
    const step = stages.length > 1 ? (outX - 90 - stageX0) / (stages.length - 1) : 0;

    const nodes = [];
    let y = top;
    stages.forEach((s, i) => {
      nodes.push({ ...s, x: stageX0 + i * step, y, h: s.entered * k });
      y += (s.completed || 0) * k;        // l'étape suivante démarre sous les validés
    });

    // Issues à droite : Validés en haut (aligné sur le flux), les autres en dessous
    const outNodes = [];
    let oy = top;
    outs.forEach((o, idx) => {
      if (idx > 0) oy += outcomeGap;
      outNodes.push({ ...o, count: totals[o.outcome], x: outX, y: oy, h: totals[o.outcome] * k });
      oy += totals[o.outcome] * k;
    });
    const height = Math.max(top + total * k, oy) + 30;

    const links = [];
    const cursor = Object.fromEntries(outNodes.map(o => [o.key, o.y]));
    const exits = Object.fromEntries(outNodes.map(o => [o.key, []]));
    nodes.forEach((n, i) => {
      let cy = n.y;
      const seg = (key) => { const c = n[key] || 0; const h = c * k; const y0 = cy; cy += h; return { c, y0, h }; };
      const done = seg('completed');
      if (done.c && cursor.completed != null) {
        links.push({ id: `completed${i}`, kind: 'completed', from: n, out: outNodes.find(o => o.key === 'completed'), sy: done.y0, sh: done.h, ty: cursor.completed, th: done.h, count: done.c, color: OUTCOMES[0].color });
        cursor.completed += done.h;
      }
      const pass = seg('passed');
      if (pass.c && i < nodes.length - 1) {
        links.push({ id: `p${i}`, kind: 'pass', from: n, to: nodes[i + 1], sy: pass.y0, sh: pass.h, ty: nodes[i + 1].y, th: nodes[i + 1].h, count: pass.c, color: FLOW_COLOR });
      }
      ['inProgress', 'expired', 'rejected'].forEach(key => {
        const o = outNodes.find(x => x.key === key);
        const sg = seg(key);
        if (sg.c && o) exits[key].push({ id: `${key}${i}`, kind: key, from: n, out: o, sy: sg.y0, sh: sg.h, count: sg.c, color: o.color, stageIdx: i });
      });
    });
    // Les étapes les plus avancées partent plus haut : elles arrivent en haut de l'issue
    Object.entries(exits).forEach(([key, list]) => {
      list.sort((a, b) => b.stageIdx - a.stageIdx).forEach(l => {
        links.push({ ...l, ty: cursor[key], th: l.sh });
        cursor[key] += l.sh;
      });
    });
    nodes.forEach(n => { n.h = draw(n.h); });
    outNodes.forEach(o => { o.h = draw(o.h); });
    links.forEach(l => { l.sh = draw(l.sh); l.th = draw(l.th); });
    return { W, height, nodeW, nodes, outNodes, links, top };
  }, [stages, totals, width, total]);

  const { W, height, nodeW, nodes, outNodes, links, top } = layout;
  // Survol : un ruban, une étape (ses rubans entrants et sortants) ou une issue
  // (ses rubans entrants) — le reste s'estompe
  const active = hover?.id;
  const linkRelated = (l) => !active || active === l.id
    || active === `n${l.from.step}` || (l.kind === 'pass' && active === `n${l.to.step}`)
    || (l.out && active === `o${l.out.key}`);

  const showTip = (e, id, title, lines) => {
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top, title, lines });
  };

  return (
    <>
      <svg width="100%" viewBox={`0 0 ${W} ${layout.height}`} role="img" aria-label={t('Flux de validation')} style={{ display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}>
        {/* Rubans */}
        {links.map(l => {
          const x0 = l.from.x + nodeW;
          const x1 = l.kind === 'pass' ? l.to.x : l.out.x;
          const base = l.kind === 'pass' ? 0.26 : l.kind === 'completed' ? 0.24 : 0.34;
          const op = !active ? base : linkRelated(l) ? Math.min(0.62, base * 2.2) : 0.06;
          const from = t('Étape {{n}}', { n: l.from.step });
          const to = l.kind === 'pass' ? t('Étape {{n}}', { n: l.to.step }) : t(l.out.label);
          return (
            <path key={l.id} d={ribbon(x0, l.sy, l.sh, x1, l.ty, l.th)} fill={l.color} fillOpacity={op}
              stroke="var(--surface)" strokeWidth={l.sh > 4 ? 1.5 : 0.5}
              style={{ transition: 'fill-opacity .15s', cursor: 'default' }}
              onMouseMove={e => showTip(e, l.id, `${from} → ${to}`, [
                t('{{count}} document(s)', { count: l.count }),
                t('{{p}} % des documents de l’étape {{n}}', { p: pct(l.count, l.from.entered), n: l.from.step }),
              ])} />
          );
        })}

        {/* Étapes */}
        {nodes.map(n => {
          const id = `n${n.step}`;
          return (
            <g key={id}
              onMouseMove={e => showTip(e, id, t('Étape {{n}}', { n: n.step }), [
                t('{{count}} document(s) arrivés', { count: n.entered }),
                n.passed ? t('{{count}} vers l’étape suivante', { count: n.passed }) : null,
                n.completed ? t('{{count}} validés (fin du circuit)', { count: n.completed }) : null,
                n.inProgress ? t('{{count}} en cours', { count: n.inProgress }) : null,
                n.expired ? t('{{count}} expirés', { count: n.expired }) : null,
                n.rejected ? t('{{count}} rejetés', { count: n.rejected }) : null,
                n.avgHours != null ? t('Traitement moyen : {{d}}', { d: formatHours(n.avgHours, t) }) : null,
              ].filter(Boolean))}>
              <rect x={n.x} y={n.y} width={nodeW} height={n.h} rx={3} fill={FLOW_COLOR} />
              <text x={n.x} y={top - 30} fill="var(--fg)" fontSize={12.5} fontWeight={650}>{t('Étape {{n}}', { n: n.step })}</text>
              <text x={n.x} y={top - 14} fill="var(--fg-muted)" fontSize={11.5}>
                {n.entered} · {n.avgHours != null ? formatHours(n.avgHours, t) : '—'}
              </text>
            </g>
          );
        })}

        {/* Issues */}
        {outNodes.map(o => {
          const id = `o${o.key}`;
          const cy = o.y + o.h / 2;
          return (
            <g key={id}
              onMouseMove={e => showTip(e, id, t(o.label), [
                t('{{count}} document(s) — {{p}} % du total', { count: o.count, p: pct(o.count, total) }),
              ])}>
              <rect x={o.x} y={o.y} width={nodeW} height={o.h} rx={3} fill={o.color} />
              <text x={o.x + nodeW + 10} y={cy - 7} fill="var(--fg)" fontSize={12.5} fontWeight={650} dominantBaseline="middle">{t(o.label)}</text>
              <text x={o.x + nodeW + 10} y={cy + 9} fill="var(--fg-muted)" fontSize={11.5} dominantBaseline="middle">
                {o.count} · {pct(o.count, total)} %
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div role="tooltip" style={{
          position: 'absolute', left: Math.min(hover.x + 14, W - 230), top: hover.y + 14, width: 216, pointerEvents: 'none', zIndex: 5,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-2)', boxShadow: 'var(--shadow-2)',
          padding: '9px 11px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 650, color: 'var(--fg)', marginBottom: 2 }}>{hover.title}</div>
          {hover.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Légende */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 4, fontSize: 11.5, color: 'var(--fg-muted)' }}>
        <Legend color={FLOW_COLOR} label={t('Passe à l’étape suivante')} />
        {OUTCOMES.map(o => <Legend key={o.key} color={o.color} label={t(o.label)} />)}
        <span style={{ marginLeft: 'auto', color: 'var(--fg-subtle)' }}>{t('Sous chaque étape : documents arrivés · temps moyen de traitement')}</span>
      </div>
    </>
  );
}

const Legend = ({ color, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
  </span>
);

// ── Petit écran : étape par étape ───────────────────────────────────────────
function FlowList({ stages, totals, t }) {
  const parts = [{ key: 'passed', label: 'Étape suivante', color: FLOW_COLOR }, ...OUTCOMES];
  return (
    <div>
      {stages.map(s => (
        <div key={s.step} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--fg)' }}>{t('Étape {{n}}', { n: s.step })}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {t('{{count}} doc.', { count: s.entered })} · {formatHours(s.avgHours, t)}
            </span>
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-3)' }}>
            {parts.map(p => (s[p.key] ? <div key={p.key} title={`${t(p.label)} : ${s[p.key]}`} style={{ width: `${(s[p.key] / s.entered) * 100}%`, background: p.color }} /> : null))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 5, fontSize: 11.5, color: 'var(--fg-muted)' }}>
            {parts.map(p => (s[p.key] ? <span key={p.key}><span style={{ color: p.color }}>●</span> {t(p.label)} {s[p.key]}</span> : null))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {OUTCOMES.filter(o => totals[o.outcome]).map(o => (
          <span key={o.key} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--fg)' }}>
            <span style={{ color: o.color }}>●</span> {t(o.label)} <strong>{totals[o.outcome]}</strong> · {pct(totals[o.outcome], totals.documents)} %
          </span>
        ))}
      </div>
    </div>
  );
}
