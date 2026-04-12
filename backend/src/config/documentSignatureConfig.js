// backend/src/config/documentSignatureConfig.js

export const SIGNATURE_CONFIGS = {
  'Ordre de mission': {
    numberOfSignatures: 4,
    signatureY: 170,        // Position Y des signatures
    stampY: 210,           // Position Y des cachets
    signatureWidth: 195,   // Largeur de l'image de signature
    signatureHeight: 77,   // Hauteur de l'image de signature
    stampWidth: 70,        // Largeur du cachet
    stampHeight: 70,       // Hauteur du cachet
    blockWidth: 120,       // Largeur du bloc de signature
    margin: 30,            // Marge latérale
    layout: 'horizontal'   // Distribution horizontale
  },
  
  'Pièce de caisse': {
    numberOfSignatures: 3,
    signatureY: 100,        // Position Y pour les signatures
    stampY: 140,             // Cachets au-dessus
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 150,
    margin: 50,
    layout: 'horizontal'
  },
  
  'Demande de besoin': {
    numberOfSignatures: 3,
    signatureY: 210,
    stampY: 250,
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 160,
    margin: 45,
    layout: 'horizontal'
  },
  
  'Demande de travaux': {
    numberOfSignatures: 3,
    signatureY: 200,
    stampY: 240,
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 155,
    margin: 45,
    layout: 'horizontal'
  },
  
  'Demande de permission': {
    numberOfSignatures: 3,
    signatureY: 100,
    stampY: 150,
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 100,
    stampHeight: 100,
    blockWidth: 150,
    margin: 40,
    layout: 'horizontal'
  },
  
  'Fiche de suivi d\'équipements': {
    numberOfSignatures: 2,
    signatureY: 115,
    stampY: 160,
    signatureWidth: 180,
    signatureHeight: 65,
    stampWidth: 110,
    stampHeight: 110,
    blockWidth: 200,
    margin: 55,
    layout: 'horizontal'
  },
  
  'Demande de permutation': {
    numberOfSignatures: 5, // ✅ PASSÉ DE 3 À 5 (Demandeur, Remplaçant, Major, Chef, DDS)
    signatureY: 100,
    stampY: 140,
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 150,
    margin: 40,
    layout: 'horizontal'
  },

  // ✅ NOUVEAU : Configuration pour le Planning Opératoire
  'Planning Opératoire': {
    numberOfSignatures: 3,
    signatureY: 50,        // Position Y pour les signatures (après le tableau)
    stampY: 90,            // Cachets en dessous
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 90,
    stampHeight: 90,
    blockWidth: 165,        // Largeur augmentée pour 3 signatures
    margin: 45,
    layout: 'horizontal'    // Distribution horizontale : Chef Service | DSI | DG
  },

  // ✅ CONFIGURATION BON DE COMMANDE
  'Bon de commande': {
    numberOfSignatures: 1, // Souvent seul le DG ou Resp Achat signe la version finale pour envoi
    signatureY: 100,       // Position Y en bas (dans le cadre gauche)
    stampY: 140,           // Cachet un peu plus bas
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 90,
    stampHeight: 90,
    blockWidth: 165,
    margin: 45,            // Marge gauche pour tomber dans le cadre "VALIDATION SERVICE ACHAT / DG"
    layout: 'horizontal'
  },

  // ✅ CONFIGURATION BON DE COMMANDE INTERNE
  // Cadres translucides positionnés à ~37-48% depuis le haut de la page A4 (842pt)
  // Y pdf-lib = depuis le BAS → frame centre ≈ 480pt from bottom
  'Bon de commande interne': {
    numberOfSignatures: 3,
    signatureY: 450,       // Bas de l'image signature (60pt) → couvre 450→510pt from bottom = 39→46% from top
    stampY: 460,           // Bas du cachet (65pt) → couvre 460→525pt from bottom = 37→45% from top
    signatureWidth: 150,   // Largeur adaptée au cadre translucide (1/3 de page)
    signatureHeight: 60,
    stampWidth: 65,
    stampHeight: 65,
    blockWidth: 160,       // Calibré pour aligner sur la grille 3 colonnes du template
    margin: 29,            // margin + blockWidth/2 = 109pt = centre col 1 du grid
    layout: 'horizontal'
  },

  // ✅ CONFIGURATION ATTESTATION DE DÉPART EN CONGÉ ANNUEL
  // 1 seule zone de signature (Le Directeur Général), en bas à droite
  'Attestation de départ en congé annuel': {
    numberOfSignatures: 1,
    signatureY: 165,       // Y statique fallback (bas de page)
    stampY: 200,
    signatureWidth: 140,
    signatureHeight: 55,
    stampWidth: 80,
    stampHeight: 80,
    blockWidth: 150,
    margin: 390,           // Droite de la page : 595 - 150 - marges ≈ 390pt
    layout: 'horizontal'
  },

  // Configuration par défaut
  'default': {
    numberOfSignatures: 3,
    signatureY: 180,
    stampY: 220,
    signatureWidth: 195,
    signatureHeight: 77,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 150,
    margin: 45,
    layout: 'horizontal'
  }
};

// Fonction helper pour récupérer la config
export const getSignatureConfig = (documentCategory) => {
  return SIGNATURE_CONFIGS[documentCategory] || SIGNATURE_CONFIGS['default'];
};