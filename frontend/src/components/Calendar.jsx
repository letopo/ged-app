// frontend/src/components/Calendar.jsx - VERSION AVEC NOM DU DEMANDEUR
import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import { Calendar as CalendarIcon } from 'lucide-react';

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

  // ⬇️ FONCTION MODIFIÉE pour obtenir le nom du demandeur
  const getRequesterName = (permission) => {
    // Priorité au nom du demandeur dans metadata
    if (permission.metadata?.nomsDemandeur) {
      return permission.metadata.nomsDemandeur;
    }
    // Sinon, utiliser le nom de l'utilisateur qui a uploadé
    if (permission.uploadedBy) {
      return `${permission.uploadedBy.firstName || ''} ${permission.uploadedBy.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 bg-gray-50 border border-gray-200"></div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayPermissions = getPermissionsForDay(day);
      const today = new Date();
      const isToday = today.getDate() === day && 
                      today.getMonth() === month && 
                      today.getFullYear() === year;

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-200 p-1 relative ${
            isToday ? 'bg-blue-50 border-blue-400 border-2' : 'bg-white'
          }`}
        >
          <div className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {dayPermissions.map((permission, index) => {
              const userName = getRequesterName(permission); // ⬇️ UTILISATION DE LA NOUVELLE FONCTION
              
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p className="text-red-600 text-sm">Erreur de chargement du calendrier</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
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
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {renderCalendarDays()}
          </div>

          {permissions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Légende :</h4>
              <div className="space-y-1">
                {permissions.slice(0, 3).map((permission, index) => {
                  const userName = getRequesterName(permission); // ⬇️ UTILISATION DE LA NOUVELLE FONCTION
                  
                  const startDate = new Date(permission.dateDebut);
                  const endDate = new Date(permission.dateFin);
                  
                  return (
                    <div key={permission.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getColorForPermission(index)}`}></div>
                      <span className="text-gray-700 truncate">
                        {userName} - {startDate.toLocaleDateString('fr-FR')} au {endDate.toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  );
                })}
                {permissions.length > 3 && (
                  <div className="text-xs text-gray-500 italic">
                    ... et {permissions.length - 3} autre(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Calendar;