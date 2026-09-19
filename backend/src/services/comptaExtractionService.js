// backend/src/services/comptaExtractionService.js
// Extraction des champs d'une pièce de caisse scannée par Claude (vision).
// Même architecture que invoiceExtractionService.js, prompt adapté aux reçus/BV de caisse.

import fs from 'fs/promises';
import path from 'path';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const MIME_IMAGE = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const PROMPT = `Tu es un assistant de saisie comptable spécialisé dans les pièces de caisse (reçus, bons de versement, bons de caisse, quittances).

Analyse attentivement la pièce. Réponds UNIQUEMENT avec un objet JSON pur, sans texte autour, sans balises Markdown.

RÈGLE PRINCIPALE — pièce simple vs multi-lignes :
- Si la pièce contient UNE SEULE opération/désignation avec un montant → utilise le format SIMPLE.
- Si la pièce contient PLUSIEURS lignes de désignation avec des montants distincts → utilise le format MULTI-LIGNES.

FORMAT SIMPLE (une seule ligne) :
{
  "multiLignes": false,
  "libelle": "objet ou motif de la pièce, ou null",
  "datePiece": "AAAA-MM-JJ ou null",
  "numeroPiece": "numéro de référence tel qu'écrit, ou null",
  "montant": 45000,
  "devise": "XAF",
  "typeMouvement": "entree | sortie | inconnu",
  "confiance": "haute | moyenne | basse"
}

FORMAT MULTI-LIGNES (plusieurs désignations) :
{
  "multiLignes": true,
  "datePiece": "AAAA-MM-JJ ou null",
  "numeroPiece": "numéro de référence tel qu'écrit, ou null",
  "devise": "XAF",
  "typeMouvement": "entree | sortie | inconnu",
  "confiance": "haute | moyenne | basse",
  "lignes": [
    { "libelle": "Désignation de la ligne 1", "montant": 15000 },
    { "libelle": "Désignation de la ligne 2", "montant": 8500 },
    { "libelle": "Désignation de la ligne 3", "montant": 21000 }
  ]
}

Règles :
- En mode multi-lignes, chaque "montant" est celui de la ligne spécifique, PAS le total global.
- Le "libelle" en mode simple est l'objet principal de la pièce, pas le nom de la structure émettrice.
- "typeMouvement" s'applique à toute la pièce : entree = argent reçu, sortie = argent décaissé.
- N'invente jamais une valeur : si absent ou illisible, mets null.
- Les montants sont des nombres SANS séparateur de milliers ni symbole (ex: 45000 pas "45 000 XAF").
- Réponds en JSON pur uniquement.`;

async function buildSourceBlock(filePath, mimeType) {
  const data = await fs.readFile(filePath);
  const base64 = data.toString('base64');

  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  }
  if (MIME_IMAGE.includes(mimeType)) {
    const mt = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    return { type: 'image', source: { type: 'base64', media_type: mt, data: base64 } };
  }
  throw new Error(`Type de fichier non supporté pour l'extraction : ${mimeType}`);
}

function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) { /* */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) { /* */ } }
  return null;
}

function normalizeMontant(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const digits = String(value).replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const n = parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

export const extractComptaFields = async (filePath, mimeType) => {
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
    messages: [{ role: 'user', content: [sourceBlock, { type: 'text', text: PROMPT }] }],
  };

  console.log(`🧾 Extraction pièce comptable (${MODEL}) pour ${path.basename(filePath)}…`);

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

  if (!parsed) throw new Error("Réponse du modèle illisible (JSON non trouvé).");

  const typeMouvement = ['entree', 'sortie', 'inconnu'].includes(parsed.typeMouvement) ? parsed.typeMouvement : 'inconnu';
  const base = {
    datePiece:     parsed.datePiece || null,
    numeroPiece:   parsed.numeroPiece || null,
    devise:        parsed.devise || 'XAF',
    typeMouvement,
    confiance:     parsed.confiance || null,
    _raw:          parsed,
  };

  if (parsed.multiLignes && Array.isArray(parsed.lignes) && parsed.lignes.length > 1) {
    return {
      ...base,
      multiLignes: true,
      libelle:     null,
      montant:     null,
      lignes: parsed.lignes.map((l, i) => ({
        libelle: l.libelle || `Ligne ${i + 1}`,
        montant: normalizeMontant(l.montant),
      })),
    };
  }

  return {
    ...base,
    multiLignes: false,
    libelle:     parsed.libelle || null,
    montant:     normalizeMontant(parsed.montant),
    lignes:      null,
  };
};

export default { extractComptaFields };
