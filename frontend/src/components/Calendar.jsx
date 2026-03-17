// frontend/src/components/Calendar.jsx - VERSION AVEC JOURS FÉRIÉS CAMEROUNAIS ET DARK MODE
import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import { Calendar as CalendarIcon, Flag } from 'lucide-react';
// Assurez-vous que les fonctions suivantes sont mises à jour pour le Dark Mode si elles retournent des classes de couleur de fond/texte
import { isHoliday, getHolidayColor } from '../utils/cameroonHolidays';

const Calendar = ({ month, year }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPermissions();
  }, [month, year]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const response = await calendarAPI.getPermissions(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setPermissions(response.data.data || []);
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    // getDay() retourne 0 pour dimanche, 1 pour lundi...
    return new Date(year, month, 1).getDay();
  };

  const getMonthName = () => {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isDateInRange = (day, permission) => {
    try {
      const currentDate = new Date(year, month, day);
      const startDate = new Date(permission.dateDebut);
      const endDate = new Date(permission.dateFin);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }
      
      // Réinitialiser les heures pour une comparaison jour-par-jour
      currentDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return currentDate >= startDate && currentDate <= endDate;
    } catch (error) {
      console.error('Erreur comparaison dates:', error);
      return false;
    }
  };

  const getPermissionsForDay = (day) => {
    return permissions.filter(permission => isDateInRange(day, permission));
  };

  const getColorForPermission = (index) => {
    // Les couleurs des points de permission n'ont pas de dark: variant ici
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500',
    ];
    return colors[index % colors.length];
  };

  const getRequesterName = (permission) => {
    if (permission.metadata?.nomsDemandeur) {
      return permission.metadata.nomsDemandeur;
    }
    if (permission.uploadedBy) {
      return `${permission.uploadedBy.firstName || ''} ${permission.uploadedBy.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  // Vérifier si c'est un dimanche
  const isSunday = (day) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    // Le getDay() de JS est 0=Dimanche, 1=Lundi... donc on utilise l'index directement
    const days = [];

    // Cases vides avant le 1er du mois
    for (let i = 0; i < firstDay; i++) {
      // Styles Dark Mode pour les cases vides
      days.push(
        <div key={`empty-${i}`} className="h-24 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border"></div>
      );
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPermissions = getPermissionsForDay(day);
      const today = new Date();
      const isToday = today.getDate() === day && 
                      today.getMonth() === month && 
                      today.getFullYear() === year;

      // Vérifier si c'est un jour férié
      const holiday = isHoliday(year, month, day);
      const isSundayDay = isSunday(day);

      // Classes CSS dynamiques selon le type de jour
      let dayClasses = 'h-24 border border-gray-200 dark:border-dark-border p-2 relative transition-all hover:shadow-md';
      let numberClasses = 'text-sm font-semibold';
      
      if (isToday) {
        // Aujourd'hui (bleu)
        dayClasses += ' bg-blue-50 border-blue-400 border-2 ring-2 ring-blue-200 dark:bg-blue-900/20 dark:border-blue-700 dark:ring-blue-700/50';
        numberClasses += ' text-blue-600 dark:text-blue-400';
      } else if (holiday) {
        // Jours fériés (utilise la fonction getHolidayColor)
        const holidayColorClass = getHolidayColor(holiday.type); // Ex: bg-red-50 border-red-200
        const isCivil = holiday.type === 'civil';
        const darkColorClass = isCivil ? 'bg-red-900/10 border-red-700' : 'bg-green-900/10 border-green-700'; // Simplifié pour le Dark Mode
        
        dayClasses += ` ${holidayColorClass} border-2 dark:${darkColorClass}`;
        numberClasses += ' text-red-600 dark:text-red-400';
      } else if (isSundayDay) {
        // Dimanche (rouge clair)
        dayClasses += ' bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-700';
        numberClasses += ' text-red-500 dark:text-red-400';
      } else {
        // Jours normaux (blanc/surface)
        dayClasses += ' bg-white dark:bg-dark-surface';
        numberClasses += ' text-gray-700 dark:text-dark-text';
      }

      days.push(
        <div key={day} className={dayClasses}>
          {/* En-tête du jour */}
          <div className="flex items-center justify-between mb-1">
            <div className={numberClasses}>
              {day}
            </div>
            
            {/* Icône pour les jours fériés */}
            {holiday && (
              <Flag className="w-3 h-3 text-red-600 dark:text-red-400" title={holiday.title} />
            )}
          </div>

          {/* Nom du jour férié */}
          {holiday && (
            <div className="text-[9px] font-semibold text-red-700 dark:text-red-300 mb-1 leading-tight">
              🇨🇲 {holiday.title}
            </div>
          )}

          {/* Points des permissions */}
          <div className="flex flex-wrap gap-1">
            {dayPermissions.map((permission, index) => {
              const userName = getRequesterName(permission);
              
              return (
                <div
                  key={`${permission.id}-${index}`}
                  className={`w-2 h-2 rounded-full ${getColorForPermission(index)}`}
                  title={`${userName} - ${permission.title || 'Permission'}`}
                ></div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  if (error) {
    return (
      // Support Dark Mode pour le message d'erreur
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-4">
        <p className="text-red-600 dark:text-red-400 text-sm">Erreur de chargement du calendrier</p>
      </div>
    );
  }

  return (
    // Support Dark Mode pour le conteneur principal
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm dark:shadow-none border border-gray-200 dark:border-dark-border p-4">
      <div className="flex items-center justify-between mb-4">
        {/* Support Dark Mode pour le titre */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text capitalize flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {getMonthName()}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-0 mb-2">
            {/* Jours de la semaine - Support Dark Mode pour le texte */}
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, index) => (
              <div 
                key={day} 
                className={`text-center text-xs font-semibold py-2 ${
                  index === 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-dark-text-secondary'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-0">
            {renderCalendarDays()}
          </div>

          {/* Légende - Support Dark Mode */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Légende :
            </h4>
            
            {/* Légende des types de jours - Support Dark Mode pour le texte et les couleurs des blocs */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 dark:bg-red-900/30 dark:border-red-700 rounded"></div>
                <span className="text-gray-700 dark:text-dark-text">Jours fériés civils</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 dark:bg-green-900/30 dark:border-green-700 rounded"></div>
                <span className="text-gray-700 dark:text-dark-text">Fête Nationale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700 rounded"></div>
                <span className="text-gray-700 dark:text-dark-text">Fériés chrétiens</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-teal-100 border-2 border-teal-300 dark:bg-teal-900/30 dark:border-teal-700 rounded"></div>
                <span className="text-gray-700 dark:text-dark-text">Fériés musulmans</span>
              </div>
            </div>

            {/* Légende des permissions */}
            {permissions.length > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-dark-border pt-3 mb-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mb-2">Permissions en cours :</p>
                </div>
                <div className="space-y-1">
                  {permissions.slice(0, 3).map((permission, index) => {
                    const userName = getRequesterName(permission);
                    const startDate = new Date(permission.dateDebut);
                    const endDate = new Date(permission.dateFin);
                    
                    return (
                      <div key={permission.id} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorForPermission(index)}`}></div>
                        <span className="text-gray-700 dark:text-dark-text truncate">
                          {userName} - {startDate.toLocaleDateString('fr-FR')} au {endDate.toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    );
                  })}
                  {permissions.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary italic">
                      ... et {permissions.length - 3} autre(s)
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;