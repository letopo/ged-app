// frontend/src/utils/dateUtils.js

/**
 * Calcule et retourne la différence de temps entre la date donnée et maintenant.
 * @param {string | Date} date - La date à comparer.
 * @returns {string} - Le temps écoulé (ex: "il y a 5 minutes").
 */
export const timeAgo = (date) => {
    if (!date) return '';

    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    // Si moins de 10 secondes, afficher "il y a quelques instants"
    if (seconds < 10) return "il y a quelques instants";

    let interval = seconds / 31536000;
    if (interval > 1) return `il y a ${Math.floor(interval)} an${Math.floor(interval) > 1 ? 's' : ''}`;

    interval = seconds / 2592000;
    if (interval > 1) return `il y a ${Math.floor(interval)} mois`;

    interval = seconds / 86400;
    if (interval > 1) return `il y a ${Math.floor(interval)} jour${Math.floor(interval) > 1 ? 's' : ''}`;

    interval = seconds / 3600;
    if (interval > 1) return `il y a ${Math.floor(interval)} heure${Math.floor(interval) > 1 ? 's' : ''}`;

    interval = seconds / 60;
    if (interval > 1) return `il y a ${Math.floor(interval)} minute${Math.floor(interval) > 1 ? 's' : ''}`;

    return `il y a ${Math.floor(seconds)} seconde${Math.floor(seconds) > 1 ? 's' : ''}`;
};


export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Dimanche, 6 = Samedi
};

export const calculateBusinessDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return 0;

  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const calculateTotalDuration = (periods) => {
  return periods.reduce((total, period) => {
    if (period.startDate && period.endDate) {
      return total + calculateBusinessDays(period.startDate, period.endDate);
    }
    return total;
  }, 0);
};

export const formatDateFr = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR');
};