// backend/src/utils/cameroonHolidays.js - Jours fériés du Cameroun

/**
 * Calcule la date de Pâques pour une année donnée (Algorithme de Meeus/Jones/Butcher)
 * @param {number} year - L'année
 * @returns {Date} - Date de Pâques
 */
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Calcule les dates des fêtes musulmanes (approximatif - à ajuster chaque année)
 * Note: Les dates exactes dépendent de l'observation lunaire
 */
const islamicHolidays2025 = {
  aidElFitr: new Date(2025, 2, 30), // 30 mars 2025 (estimation)
  aidElKebir: new Date(2025, 5, 7)  // 7 juin 2025 (estimation)
};

const islamicHolidays2026 = {
  aidElFitr: new Date(2026, 2, 20), // 20 mars 2026 (estimation)
  aidElKebir: new Date(2026, 4, 28)  // 28 mai 2026 (estimation)
};

/**
 * Retourne tous les jours fériés du Cameroun pour une année donnée
 * @param {number} year - L'année
 * @returns {Array} - Liste des jours fériés avec leur nom
 */
export function getCameroonHolidays(year) {
  const holidays = [];
  
  // Jours fériés fixes
  holidays.push({
    date: new Date(year, 0, 1),
    name: "Nouvel An",
    type: "fixed"
  });
  
  holidays.push({
    date: new Date(year, 1, 11),
    name: "Fête de la Jeunesse",
    type: "fixed"
  });
  
  holidays.push({
    date: new Date(year, 4, 1),
    name: "Fête du Travail",
    type: "fixed"
  });
  
  holidays.push({
    date: new Date(year, 4, 20),
    name: "Fête Nationale",
    type: "fixed"
  });
  
  holidays.push({
    date: new Date(year, 7, 15),
    name: "Assomption",
    type: "fixed"
  });
  
  holidays.push({
    date: new Date(year, 11, 25),
    name: "Noël",
    type: "fixed"
  });
  
  // Jours fériés liés à Pâques
  const easter = getEasterDate(year);
  
  // Vendredi Saint (2 jours avant Pâques)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    date: goodFriday,
    name: "Vendredi Saint",
    type: "christian"
  });
  
  // Lundi de Pâques (1 jour après Pâques)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    date: easterMonday,
    name: "Lundi de Pâques",
    type: "christian"
  });
  
  // Ascension (39 jours après Pâques)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  holidays.push({
    date: ascension,
    name: "Ascension",
    type: "christian"
  });
  
  // Fêtes musulmanes (dates approximatives - à mettre à jour annuellement)
  if (year === 2025) {
    holidays.push({
      date: islamicHolidays2025.aidElFitr,
      name: "Aïd el-Fitr",
      type: "islamic"
    });
    holidays.push({
      date: islamicHolidays2025.aidElKebir,
      name: "Aïd el-Kebir (Tabaski)",
      type: "islamic"
    });
  } else if (year === 2026) {
    holidays.push({
      date: islamicHolidays2026.aidElFitr,
      name: "Aïd el-Fitr",
      type: "islamic"
    });
    holidays.push({
      date: islamicHolidays2026.aidElKebir,
      name: "Aïd el-Kebir (Tabaski)",
      type: "islamic"
    });
  }
  
  // Trier par date
  holidays.sort((a, b) => a.date - b.date);
  
  return holidays;
}

/**
 * Vérifie si une date est un jour férié au Cameroun
 * @param {Date} date - La date à vérifier
 * @returns {Object|null} - L'objet jour férié ou null
 */
export function isHoliday(date) {
  const year = date.getFullYear();
  const holidays = getCameroonHolidays(year);
  
  return holidays.find(holiday => {
    return holiday.date.getDate() === date.getDate() &&
           holiday.date.getMonth() === date.getMonth() &&
           holiday.date.getFullYear() === date.getFullYear();
  }) || null;
}

/**
 * Formatte une date pour comparaison (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Retourne un objet Map des jours fériés pour un accès rapide
 * @param {number} year 
 * @returns {Map}
 */
export function getHolidaysMap(year) {
  const holidays = getCameroonHolidays(year);
  const map = new Map();
  
  holidays.forEach(holiday => {
    const key = formatDateKey(holiday.date);
    map.set(key, holiday);
  });
  
  return map;
}

export default {
  getCameroonHolidays,
  isHoliday,
  formatDateKey,
  getHolidaysMap
};