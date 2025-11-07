// frontend/src/utils/cameroonHolidays.js - Jours fériés du Cameroun

/**
 * Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
 */
const getEasterDate = (year) => {
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
};

/**
 * Jours fériés fixes
 */
const getFixedHolidays = (year) => [
  { month: 0, day: 1, title: 'Jour de l\'An', type: 'civil' },
  { month: 1, day: 11, title: 'Fête de la Jeunesse', type: 'civil' },
  { month: 4, day: 1, title: 'Fête du Travail', type: 'civil' },
  { month: 4, day: 20, title: 'Fête Nationale', type: 'national' },
  { month: 7, day: 15, title: 'Assomption', type: 'religious' },
  { month: 11, day: 25, title: 'Noël', type: 'religious' }
];

/**
 * Jours fériés chrétiens (variables)
 */
const getChristianHolidays = (year) => {
  const easter = getEasterDate(year);
  
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);
  
  return [
    { 
      month: goodFriday.getMonth(), 
      day: goodFriday.getDate(), 
      title: 'Vendredi Saint', 
      type: 'religious' 
    },
    { 
      month: easterMonday.getMonth(), 
      day: easterMonday.getDate(), 
      title: 'Lundi de Pâques', 
      type: 'religious' 
    },
    { 
      month: ascension.getMonth(), 
      day: ascension.getDate(), 
      title: 'Ascension', 
      type: 'religious' 
    }
  ];
};

/**
 * Jours fériés musulmans (à mettre à jour chaque année)
 */
const getMuslimHolidays = (year) => {
  // 2025
  if (year === 2025) {
    return [
      { month: 2, day: 30, title: 'Aïd el-Fitr', type: 'muslim' },
      { month: 5, day: 7, title: 'Aïd el-Adha', type: 'muslim' }
    ];
  }
  // 2026
  if (year === 2026) {
    return [
      { month: 2, day: 20, title: 'Aïd el-Fitr', type: 'muslim' },
      { month: 4, day: 27, title: 'Aïd el-Adha', type: 'muslim' }
    ];
  }
  // 2027
  if (year === 2027) {
    return [
      { month: 2, day: 9, title: 'Aïd el-Fitr', type: 'muslim' },
      { month: 4, day: 16, title: 'Aïd el-Adha', type: 'muslim' }
    ];
  }
  
  return [];
};

/**
 * Obtenir tous les jours fériés pour une année
 */
export const getCameroonHolidays = (year) => {
  return [
    ...getFixedHolidays(year),
    ...getChristianHolidays(year),
    ...getMuslimHolidays(year)
  ];
};

/**
 * Vérifier si un jour est férié
 */
export const isHoliday = (year, month, day) => {
  const holidays = getCameroonHolidays(year);
  return holidays.find(h => h.month === month && h.day === day);
};

/**
 * Obtenir la couleur selon le type de jour férié
 */
export const getHolidayColor = (type) => {
  const colors = {
    civil: 'bg-red-100 border-red-300',
    national: 'bg-green-100 border-green-300',
    religious: 'bg-purple-100 border-purple-300',
    muslim: 'bg-teal-100 border-teal-300'
  };
  return colors[type] || 'bg-gray-100 border-gray-300';
};

export default {
  getCameroonHolidays,
  isHoliday,
  getHolidayColor
};