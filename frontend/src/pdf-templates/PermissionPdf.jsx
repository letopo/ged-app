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

const styles = StyleSheet.create({
  page: {
    padding: 40,
    // AJOUT IMPORTANT : padding en bas pour éviter que le texte ne passe sous la signature
    paddingBottom: 80, 
    fontFamily: 'CustomRoboto',
    fontSize: 11,
    lineHeight: 1.5,
    // AJOUT IMPORTANT : permet de positionner le pied de page en absolu par rapport à la page
    position: 'relative' 
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },

  logo: {
    width: 90,
    height: 30
  },

  headerText: {
    textAlign: 'center'
  },

  bold: {
    fontWeight: 'bold'
  },

  title: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
    textDecoration: 'underline',
    fontWeight: 'bold'
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },

  section: {
    flexDirection: 'row',
    marginBottom: 10
  },

  label: {
    width: 130,
    fontWeight: 'bold'
  },

  value: {
    flex: 1,
    borderBottom: '1pt dotted #000'
  },

  periodsBox: {
    border: '1pt solid #000',
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#f0f0f0'
  },

  interimBox: {
    marginTop: 15,
    padding: 5,
    border: '1pt dotted #999',
    backgroundColor: '#fffbeb'
  },

  // MODIFICATION ICI : Le style pour ancrer les signatures en bas
  signatureSection: {
    position: 'absolute', // Sort du flux normal
    bottom: 90,           // Collé en bas (ajustez selon votre marge d'impression)
    left: 40,             // Alignement marge gauche
    right: 40,            // Alignement marge droite
    flexDirection: 'row',
    justifyContent: 'space-between',
    // J'ai retiré le borderTop pour coller à l'image 1, remettez-le si besoin
  },

  signatureBlock: {
    width: '30%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold' // Ajouté pour correspondre au visuel
  },

  footerBox: {
    height: 50,
    border: '1pt dotted #ccc',
    marginTop: 5,
    textAlign: 'left',
    padding: 2,
    fontSize: 8,
    color: '#666'
  }
});

// Format date
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '...';

export const PermissionPdfDocument = ({ formData }) => (
  <Document>
    <Page size="A4" style={styles.page}>

      {/* EN-TÊTE (Conservé) */}
      <View style={styles.header}>
        <Image src={logo} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>ORDRE DE MALTE</Text>
          <Text style={{ fontSize: 12, color: '#DC2626' }}>HÔPITAL SAINT JEAN DE MALTE</Text>
        </View>
      </View>

      {/* INFOS HAUT (Conservé) */}
      <View style={styles.row}>
        <View style={{ width: '60%' }}>
          <View style={styles.section}>
            <Text style={styles.label}>NOMS et Prénom(s) :</Text>
            <Text style={styles.value}>{formData.noms_prenoms}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Service :</Text>
            <Text style={styles.value}>{formData.service}</Text>
          </View>
        </View>

        <View style={{ width: '35%' }}>
          <Text style={{ textAlign: 'right', marginBottom: 5 }}>
             Njombé le {formData.date_lieu || formatDate(new Date())}
          </Text>
          <Text style={{ marginTop: 15, textAlign: 'right', fontWeight: 'bold' }}>
            A Monsieur le Directeur Général
          </Text>
          <Text style={{ textAlign: 'right' }}>
            De l'Hôpital Saint Jean de Malte de Njombé
          </Text>
        </View>
      </View>

      {/* OBJET (Conservé) */}
      <View style={[styles.section, { marginTop: 10 }]}>
        <Text style={styles.label}>Objet :</Text>
        <Text style={[styles.value, styles.bold]}>Demande de permission d'absence</Text>
      </View>

      {/* CORPS (Conservé) */}
      <Text style={{ marginTop: 15, marginBottom: 10 }}>Monsieur,</Text>
      <Text>
        Je viens par cette demande solliciter une permission de{' '}
        <Text style={styles.bold}>« {formData.totalDays} jour(s) ouvrable(s) »</Text>.
      </Text>

      {/* DÉTAIL DES PÉRIODES (Conservé - C'est votre liste dynamique) */}
      <View style={styles.periodsBox}>
        <Text style={[styles.bold, { marginBottom: 5, textDecoration: 'underline' }]}>
          Détail des périodes :
        </Text>

        {formData.periods?.map((p, i) => (
          <Text key={i} style={{ marginBottom: 2 }}>
            - Du <Text style={styles.bold}>{formatDate(p.startDate)}</Text> au{' '}
            <Text style={styles.bold}>{formatDate(p.endDate)}</Text>
          </Text>
        ))}
      </View>

      {/* MOTIF (Conservé) */}
      <Text style={{ marginTop: 5 }}>
        Pour le motif suivant :{' '}
        <Text style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
          {formData.motif}
        </Text>
        {formData.motif_exceptionnel ? ` (${formData.motif_exceptionnel})` : ''}.
      </Text>

      {/* INTERIM (Conservé) */}
      <View style={styles.interimBox}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
            Intérim assuré par : <Text style={{fontWeight: 'normal'}}>{formData.interim || ''}</Text>
            </Text>
             <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#666' }}>
            (A remplir par le validateur)
            </Text>
        </View>
      </View>

      {/* TEXTE FINAL (Conservé) */}
      <Text style={{ marginTop: 20 }}>
        Dans l'attente d'une suite favorable, veuillez agréer Monsieur l'expression de mon plus profond respect.
      </Text>

      {/* SIGNATURES (MODIFIÉ : Position Absolue + Nouveaux Noms) */}
      <View style={styles.signatureSection}>
        {/* Alignement Gauche */}
        <View style={[styles.signatureBlock, { textAlign: 'left' }]}>
          <Text style={styles.bold}>Chef de Pôle</Text>
        </View>
        
        {/* Alignement Centre */}
        <View style={styles.signatureBlock}>
          <Text style={styles.bold}>Signature du RH</Text>
        </View>
        
        {/* Alignement Droite */}
        <View style={[styles.signatureBlock, { textAlign: 'right' }]}>
          <Text style={styles.bold}>Le Directeur Général</Text>
        </View>
      </View>

    </Page>
  </Document>
);