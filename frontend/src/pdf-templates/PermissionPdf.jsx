// frontend/src/pdf-templates/PermissionPdf.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import logo from '../assets/logo-ordre-malte.png';

// 🔥 Enregistrement correct de toutes les polices Roboto
Font.register({
  family: 'CustomRoboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Roboto-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/Roboto-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// ── Cadres de signature (3) : géométrie partagée entre le dessin du PDF et les
// zones transmises au serveur (metadata.signatureZones), en points PDF (A4).
// Au-dessus de chaque cadre, un emplacement vide reçoit à la soumission le titre
// et le nom du validateur (backend utils/signatureLabels.js).
const A4_W = 595.28;
const SIG = { left: 40, right: 40, bottom: 60, labelH: 28, gap: 4, boxH: 110, widthPct: 0.3, count: 3 };
const SIG_W = (A4_W - SIG.left - SIG.right) * SIG.widthPct;
const SIG_SPACE = (A4_W - SIG.left - SIG.right - SIG.count * SIG_W) / (SIG.count - 1);
export const PERMISSION_SIGNATURE_ZONES = Array.from({ length: SIG.count }, (_, i) => {
  const x = SIG.left + i * (SIG_W + SIG_SPACE);
  return {
    index: i + 1,
    x, y: SIG.bottom, width: SIG_W, height: SIG.boxH,
    label: { x, y: SIG.bottom + SIG.boxH + SIG.gap, width: SIG_W, height: SIG.labelH },
  };
});

const INK = '#111827';
const MUTED = '#6b7280';
const BRAND = '#1B3A6B';
const RED = '#DC2626';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 44,
    // Place réservée en bas aux cadres de signature (géométrie fixe, cf. SIG)
    paddingBottom: SIG.bottom + SIG.boxH + SIG.gap + SIG.labelH + 16,
    fontFamily: 'CustomRoboto',
    fontSize: 10.5,
    lineHeight: 1.45,
    color: INK,
    position: 'relative',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1.5pt solid ${RED}`, marginBottom: 18 },
  logo: { width: 96, height: 32, objectFit: 'contain' },
  orgTitle: { fontSize: 13, fontWeight: 'bold', textAlign: 'right', letterSpacing: 0.4 },
  orgSub: { fontSize: 10.5, color: RED, fontWeight: 'bold', textAlign: 'right' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoCol: { width: '54%' },
  infoRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  infoLabel: { width: 92, fontSize: 8.5, fontWeight: 'bold', color: MUTED, textTransform: 'uppercase' },
  infoValue: { flex: 1, borderBottom: '0.6pt dotted #9ca3af', paddingBottom: 1, fontWeight: 'bold' },
  addrCol: { width: '40%', alignItems: 'flex-end' },
  objetRow: { flexDirection: 'row', marginBottom: 14, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#f3f5fa', borderLeft: `2.5pt solid ${BRAND}` },
  objetLabel: { fontWeight: 'bold', marginRight: 6 },
  objetValue: { fontWeight: 'bold', textDecoration: 'underline' },
  paragraph: { marginBottom: 8 },
  bold: { fontWeight: 'bold' },
  table: { marginTop: 4, marginBottom: 10, border: '0.6pt solid #cbd2e1', borderRadius: 2 },
  thRow: { flexDirection: 'row', backgroundColor: '#eef2fb', borderBottom: '0.6pt solid #cbd2e1' },
  tr: { flexDirection: 'row', borderBottom: '0.4pt solid #e5e7eb' },
  th: { paddingVertical: 4, paddingHorizontal: 6, fontSize: 8.5, fontWeight: 'bold', color: BRAND, textTransform: 'uppercase' },
  td: { paddingVertical: 4, paddingHorizontal: 6 },
  colN: { width: '10%' },
  colDate: { width: '32%' },
  colDays: { width: '26%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', backgroundColor: '#f9fafb' },
  interimBox: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4, marginBottom: 12, paddingVertical: 7, paddingHorizontal: 8, border: '0.6pt dashed #c4c9d4', borderRadius: 2 },
  interimLabel: { fontSize: 10.5, fontWeight: 'bold' },
  interimLine: { flex: 1, marginHorizontal: 6, borderBottom: '0.6pt dotted #9ca3af', height: 10 },
  interimNote: { fontSize: 7, fontStyle: 'italic', color: MUTED },
  signatureSection: { position: 'absolute', bottom: SIG.bottom, left: SIG.left, right: SIG.right, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBlock: { width: SIG_W },
  // Emplacement du titre du signataire (rempli à la soumission)
  signatureLabel: { height: SIG.labelH, marginBottom: SIG.gap },
  // Cadre : cachet (moitié haute) + signature (moitié basse), posés à la validation
  signatureBox: { height: SIG.boxH, border: '0.5pt dashed #c7cbe0', borderRadius: 3 },
  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, fontSize: 7, color: '#9ca3af', textAlign: 'center' },
});

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '…');

// Jours ouvrables (lundi → vendredi), comme à l'écran
const businessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate); const end = new Date(endDate);
  start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
  if (start > end) return 0;
  let count = 0; const cur = new Date(start);
  while (cur <= end) { const d = cur.getDay(); if (d !== 0 && d !== 6) count++; cur.setDate(cur.getDate() + 1); }
  return count;
};

const MOTIF_LABELS = { Exceptionnel: 'Permission exceptionnelle' };

export const PermissionPdfDocument = ({ formData }) => {
  const periods = (formData.periods || []).filter((p) => p.startDate || p.endDate);
  const total = formData.totalDays ?? periods.reduce((a, p) => a + businessDays(p.startDate, p.endDate), 0);
  const motif = MOTIF_LABELS[formData.motif] || formData.motif || 'Personnel';
  return (
    <Document title={`Demande de permission - ${formData.noms_prenoms || ''}`} author={formData.noms_prenoms || ''}>
      <Page size="A4" style={styles.page}>

        {/* EN-TÊTE */}
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
          <View>
            <Text style={styles.orgTitle}>ORDRE DE MALTE</Text>
            <Text style={styles.orgSub}>HÔPITAL SAINT JEAN DE MALTE</Text>
          </View>
        </View>

        {/* DEMANDEUR / DESTINATAIRE */}
        <View style={styles.topRow}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Noms et prénom(s)</Text>
              <Text style={styles.infoValue}>{formData.noms_prenoms || ' '}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Service</Text>
              <Text style={styles.infoValue}>{formData.service || ' '}</Text>
            </View>
          </View>
          <View style={styles.addrCol}>
            <Text style={{ marginBottom: 12 }}>{formData.date_lieu || `Njombé, le ${formatDate(new Date())}`}</Text>
            <Text style={[styles.bold, { textAlign: 'right' }]}>A Monsieur le Directeur Général</Text>
            <Text style={{ textAlign: 'right' }}>De l'Hôpital Saint Jean de Malte de Njombé</Text>
          </View>
        </View>

        {/* OBJET */}
        <View style={styles.objetRow}>
          <Text style={styles.objetLabel}>Objet :</Text>
          <Text style={styles.objetValue}>{formData.objet || "Demande de permission d'absence"}</Text>
        </View>

        {/* CORPS */}
        <Text style={styles.paragraph}>Monsieur,</Text>
        <Text style={styles.paragraph}>
          Je viens par cette demande solliciter une permission de{' '}
          <Text style={styles.bold}>« {total} jour(s) ouvrable(s) »</Text>, selon le détail ci-dessous :
        </Text>

        {/* PÉRIODES */}
        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colN]}>N°</Text>
            <Text style={[styles.th, styles.colDate]}>Du</Text>
            <Text style={[styles.th, styles.colDate]}>Au</Text>
            <Text style={[styles.th, styles.colDays]}>Jours ouvrables</Text>
          </View>
          {(periods.length ? periods : [{}]).map((p, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colN]}>{i + 1}</Text>
              <Text style={[styles.td, styles.colDate, styles.bold]}>{formatDate(p.startDate)}</Text>
              <Text style={[styles.td, styles.colDate, styles.bold]}>{formatDate(p.endDate)}</Text>
              <Text style={[styles.td, styles.colDays]}>{businessDays(p.startDate, p.endDate)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.td, { width: '74%', textAlign: 'right', fontWeight: 'bold' }]}>Total</Text>
            <Text style={[styles.td, styles.colDays, styles.bold]}>{total}</Text>
          </View>
        </View>

        {/* MOTIF (une seule ligne de texte : espaces et ponctuation conservés) */}
        <Text style={styles.paragraph}>
          {'Pour le motif suivant : '}
          <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>{motif}</Text>
          {formData.motif === 'Exceptionnel' && formData.motif_exceptionnel ? (
            <>{' — '}<Text style={{ textDecoration: 'underline' }}>{formData.motif_exceptionnel}</Text></>
          ) : null}
          {'.'}
        </Text>

        {/* INTÉRIM : le serveur écrit le nom après ce libellé à l'approbation (texte à garder identique) */}
        <View style={styles.interimBox}>
          <Text style={styles.interimLabel}>Intérim assuré par :</Text>
          <View style={styles.interimLine} />
          <Text style={styles.interimNote}>(à remplir par le validateur)</Text>
        </View>

        <Text style={styles.paragraph}>
          Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.
        </Text>

        {/* SIGNATURES : titres et noms des validateurs inscrits à la soumission */}
        <View style={styles.signatureSection}>
          {PERMISSION_SIGNATURE_ZONES.map((z) => (
            <View key={z.index} style={styles.signatureBlock}>
              <View style={styles.signatureLabel} />
              <View style={styles.signatureBox} />
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Hôpital Saint Jean de Malte — Njombé · Document généré par la GED
        </Text>
      </Page>
    </Document>
  );
};
