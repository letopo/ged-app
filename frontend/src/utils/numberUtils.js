// frontend/src/utils/numberUtils.js

/**
 * Convertit une valeur en nombre, avec gestion des cas null/undefined
 */
export const safeNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    
    const num = typeof value === 'number' ? value : parseFloat(value);
    
    // Vérifier si c'est un nombre valide
    if (isNaN(num)) {
      console.warn(`Valeur non numérique: ${value}, retourne ${defaultValue}`);
      return defaultValue;
    }
    
    return num;
  };
  
  /**
   * Formate un nombre avec 2 décimales
   */
  export const formatDecimal = (value) => {
    const num = safeNumber(value);
    return num.toFixed(2);
  };
  
  /**
   * Formate un nombre en monnaie XAF
   */
  export const formatXAF = (value) => {
    const num = safeNumber(value);
    return num.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + ' XAF';
  };