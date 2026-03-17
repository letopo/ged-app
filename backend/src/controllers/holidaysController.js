// backend/src/controllers/holidaysController.js

import { getCameroonHolidays, isHoliday, formatDateKey } from '../utils/cameroonHolidays.js';

/**
 * Récupérer tous les jours fériés pour une année
 */
export const getHolidays = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    if (year < 2000 || year > 2100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Année invalide. Veuillez fournir une année entre 2000 et 2100.' 
      });
    }
    
    const holidays = getCameroonHolidays(year);
    
    res.json({
      success: true,
      year,
      count: holidays.length,
      holidays: holidays.map(h => ({
        date: formatDateKey(h.date),
        name: h.name,
        type: h.type,
        dayOfWeek: h.date.toLocaleDateString('fr-FR', { weekday: 'long' })
      }))
    });
  } catch (error) {
    console.error('❌ Erreur récupération jours fériés:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

/**
 * Vérifier si une date est un jour férié
 */
export const checkHoliday = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètre "date" requis (format: YYYY-MM-DD).' 
      });
    }
    
    const checkDate = new Date(date);
    
    if (isNaN(checkDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Format de date invalide. Utilisez YYYY-MM-DD.' 
      });
    }
    
    const holiday = isHoliday(checkDate);
    
    res.json({
      success: true,
      date,
      isHoliday: !!holiday,
      holiday: holiday ? {
        name: holiday.name,
        type: holiday.type
      } : null
    });
  } catch (error) {
    console.error('❌ Erreur vérification jour férié:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

export default {
  getHolidays,
  checkHoliday
};