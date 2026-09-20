// backend/src/services/invoiceExtractionService.js
// Extraction des champs d'une facture/proforma prestataire par Claude (vision).
//
// Chaque prestataire a une mise en page différente : un parsing par gabarit/regex
// est trop fragile. On envoie donc la pièce (PDF natif ou image scannée) au modèle
// qui renvoie un JSON structuré { fournisseur, dateFacture, numeroFacture, montant }.
//
// Aucune dépendance externe : Node >= 18 expose fetch globalement.

import fs from 'fs/promises';
import path from 'path';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Modèle surchargeable ; Sonnet est un bon compromis fiabilité/coût pour lire
// montants et dates sur des documents scannés.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const MIME_IMAGE = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

// Instruction d'extraction. On impose une réponse JSON stricte et on précise le
// format attendu (montant numérique sans séparateurs, dates ISO).
const PROMPT = `Tu es un assistant de saisie comptable. On te donne une facture ou une proforma d'un prestataire (mise en page variable).

Extrais EXACTEMENT ces champs et réponds UNIQUEMENT avec un objet JSON, sans texte autour, sans balises Markdown :

{
  "fournisseur": "nom de l'entreprise/prestataire qui émet la facture (raison sociale), ou null",
  "dateFacture": "date d'émission de la facture au format AAAA-MM-JJ, ou null",
  "numeroFacture": "numéro de la facture tel qu'écrit (ex: 'Facture N°006/25'), ou null",
  "montant": nombre = montant total TTC à payer, en chiffres SANS séparateur de milliers ni symbole (ex: 1160250), ou null,
  "devise": "code devise ISO si visible (XAF, EUR, USD...), sinon 'XAF'",
  "confiance": "haute | moyenne | basse — ta confiance globale dans l'extraction"
}

Règles :
- Le "fournisseur" est l'émetteur de la facture, PAS le destinataire/client (souvent l'hôpital).
- Pour le montant, prends le TOTAL à payer (TTC si présent, sinon le total général). Ignore les montants partiels/lignes.
- N'invente jamais une valeur : si un champ est absent ou illisible, mets null.
- Réponds en JSON pur uniquement.`;

/**
 * Construit le bloc de contenu (document PDF ou image) pour l'API.
 */
async function buildSourceBlock(filePath, mimeType) {
  const data = await fs.readFile(filePath);
  const base64 = data.toString('base64');

  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  }

  if (MIME_IMAGE.includes(mimeType)) {
    // Normaliser jpg -> jpeg pour l'API
    const mt = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    return {
      type: 'image',
      source: { type: 'base64', media_type: mt, data: base64 },
    };
  }

  throw new Error(`Type de fichier non supporté pour l'extraction : ${mimeType}`);
}

/**
 * Extrait le premier objet JSON d'une chaîne (robustesse si le modèle ajoute du texte).
 */
function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) { /* ignore */ }
    }
  }
  return null;
}

/**
 * Normalise un montant éventuellement renvoyé sous forme de chaîne ("1 160 250").
 */
function normalizeMontant(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const digits = String(value).replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(/,/g, '.');
  // Garder uniquement le premier point décimal si plusieurs
  const n = parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrait les champs métier d'une facture.
 * @param {string} filePath  chemin absolu de la pièce
 * @param {string} mimeType  type MIME du fichier
 * @returns {Promise<{fournisseur, dateFacture, numeroFacture, montant, devise, confiance, _raw}>}
 */
export const extractInvoiceFields = async (filePath, mimeType) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error("Clé API Anthropic absente : définissez ANTHROPIC_API_KEY dans l'environnement du backend.");
    err.code = 'NO_API_KEY';
    throw err;
  }

  const sourceBlock = await buildSourceBlock(filePath, mimeType);

  const body = {
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: [sourceBlock, { type: 'text', text: PROMPT }],
      },
    ],
  };

  console.log(`🧾 Extraction facture (${MODEL}) pour ${path.basename(filePath)}…`);

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Erreur API Anthropic (${res.status}) : ${detail.slice(0, 500)}`);
  }

  const payload = await res.json();
  const text = (payload.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const parsed = parseJsonLoose(text);

  if (!parsed) {
    throw new Error("Réponse du modèle illisible (JSON non trouvé).");
  }

  return {
    fournisseur:   parsed.fournisseur || null,
    dateFacture:   parsed.dateFacture || null,
    numeroFacture: parsed.numeroFacture || null,
    montant:       normalizeMontant(parsed.montant),
    devise:        parsed.devise || 'XAF',
    confiance:     parsed.confiance || null,
    _raw:          parsed,
  };
};

export default { extractInvoiceFields };
