// backend/src/config/documentSignatureConfig.js

export const SIGNATURE_CONFIGS = {
  'Ordre de mission': {
    numberOfSignatures: 4,
    signatureY: 170,        // Position Y des signatures
    stampY: 210,           // Position Y des cachets
    signatureWidth: 110,   // Largeur de l'image de signature
    signatureHeight: 55,   // Hauteur de l'image de signature
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
    signatureWidth: 110,
    signatureHeight: 55,
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
    signatureWidth: 110,
    signatureHeight: 55,
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
    signatureWidth: 110,
    signatureHeight: 55,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 155,
    margin: 45,
    layout: 'horizontal'
  },
  
  'Demande de permission': {
    numberOfSignatures: 3,
    signatureY: 100,
    stampY: 140,
    signatureWidth: 110,
    signatureHeight: 55,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 150,
    margin: 40,
    layout: 'horizontal'
  },
  
  'Fiche de suivi d\'équipements': {
    numberOfSignatures: 2,
    signatureY: 100,
    stampY: 140,
    signatureWidth: 110,
    signatureHeight: 55,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 180,
    margin: 60,
    layout: 'horizontal'
  },
  
  'Demande de permutation': {
    numberOfSignatures: 3,
    signatureY: 100,
    stampY: 140,
    signatureWidth: 110,
    signatureHeight: 55,
    stampWidth: 70,
    stampHeight: 70,
    blockWidth: 150,
    margin: 40,
    layout: 'horizontal'
  },

  // Configuration par défaut
  'default': {
    numberOfSignatures: 3,
    signatureY: 180,
    stampY: 220,
    signatureWidth: 110,
    signatureHeight: 55,
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