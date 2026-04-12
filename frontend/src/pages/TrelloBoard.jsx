// frontend/src/pages/TrelloBoard.jsx

import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useParams, useNavigate } from 'react-router-dom';
import { trelloAPI, getSocket } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import TrelloList from '../components/TrelloList';
import TrelloCardModal from '../components/TrelloCardModal';
import { Loader, AlertTriangle, Monitor, Wrench, HeartPulse, User, RefreshCw, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageSkeleton } from '../components/SkeletonLoader';

const TrelloBoard = () => {
  const { serviceType } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ... (Code de sécurité inchangé, je le garde pour la brièveté) ...
  const hasAccess = () => {
    if (!user) return false;
    const allowedEmails = [
      'hsjm.directeurdusoutien@gmail.com',
      'hsjm.pharma@gmail.com',
      'hopitalcameroun@ordredemaltefrance.org',
      'aureleyankeu@gmail.com',
      'hsjm.moyengeneraux@gmail.com',
      'hsjm.celluleinformatique2@gmail.com',
      'hsjm.cellulebiomedicale@gmail.com'
    ];
    if (allowedEmails.includes(user.email)) return true;
    const userService = user.Service?.name || user.service || "";
    const allowedServices = ['MG', 'Moyens Généraux', 'Informatique', 'Biomédical', 'Biomedical'];
    return allowedServices.some(service => userService.includes(service));
  };

  if (!hasAccess()) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md border border-gray-200 dark:border-gray-700">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accès Restreint</h1>
          <button onClick={() => navigate('/dashboard')} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-medium">Retour au Tableau de bord</button>
        </div>
      </div>
    );
  }

  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedCard, setSelectedCard] = useState(null);

  const services = [
    { id: 'MG', label: 'Moyens Généraux', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
    { id: 'Biomedical', label: 'Biomédical', icon: HeartPulse, color: 'text-rose-600 bg-rose-50' },
    { id: 'Informatique', label: 'Informatique', icon: Monitor, color: 'text-purple-600 bg-purple-50' },
  ];

  useEffect(() => {
    fetchBoard();
    const socket = getSocket();
    if (socket) {
      socket.on('trello_card_moved', () => fetchBoard(true));
      socket.on('trello_card_created', () => fetchBoard(true));
      socket.on('trello_card_updated', () => fetchBoard(true));
      socket.on('trello_comment_added', () => fetchBoard(true));
      socket.on('trello_attachment_added', () => fetchBoard(true));
      socket.on('trello_refresh_needed', () => fetchBoard(true));
    }
    return () => {
      if (socket) {
        socket.off('trello_card_moved');
        socket.off('trello_card_created');
        socket.off('trello_card_updated');
        socket.off('trello_comment_added');
        socket.off('trello_attachment_added');
        socket.off('trello_refresh_needed');
      }
    };
  }, [serviceType]);

  useEffect(() => {
    if (selectedCard && boardData) {
      let updatedCard = null;
      for (const list of boardData.lists) {
        const found = list.cards.find(c => c.id === selectedCard.id);
        if (found) {
          updatedCard = found;
          break;
        }
      }
      if (updatedCard) {
        setSelectedCard(updatedCard);
      }
    }
  }, [boardData]);

  const fetchBoard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await trelloAPI.getBoard(serviceType || 'MG');
      setBoardData(response.data.data);
    } catch (err) {
      setError('Impossible de charger le tableau.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm("Voulez-vous importer toutes les anciennes Demandes de Travaux validées ?")) return;
    try {
      setSyncing(true);
      const response = await trelloAPI.syncLegacyDocs();
      toast(response.data.message);
      fetchBoard();
    } catch (err) {
      toast("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startList = boardData.lists.find(l => l.id === source.droppableId);
    const finishList = boardData.lists.find(l => l.id === destination.droppableId);
    const newLists = [...boardData.lists];
    
    const startCards = Array.from(startList.cards);
    const movedCard = startCards[source.index];
    startCards.splice(source.index, 1);
    
    const finishCards = source.droppableId === destination.droppableId ? startCards : Array.from(finishList.cards);
    finishCards.splice(destination.index, 0, movedCard);

    startList.cards = startCards;
    finishList.cards = finishCards;
    
    setBoardData({ ...boardData, lists: newLists });

    try {
      await trelloAPI.moveCard(draggableId, {
        newListId: destination.droppableId,
        newPosition: destination.index * 1000 + 500
      });
    } catch (err) {
      fetchBoard(true);
    }
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  // ✅ MODIFICATION ICI : Accepte le titre en paramètre
  const handleAddCard = async (listId, title) => {
    if (title) {
        await trelloAPI.createCard({ 
            listId, 
            title, 
            priority: 'medium',
            description: ''
        });
        fetchBoard(true);
    }
  };

  if (loading) return <PageSkeleton rows={6} title />;
  if (error) return <div className="flex justify-center items-center h-screen text-red-600"><AlertTriangle className="mr-2"/> {error}</div>;

  const displayLists = boardData?.lists.map(list => ({
    ...list,
    cards: onlyMyTasks 
      ? list.cards.filter(c => c.assignedTo === user.id) 
      : list.cards
  }));

  const canSync = ['admin', 'director', 'validator'].includes(user?.role);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
      {/* Header inchangé */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm z-10 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white hidden md:block">
              Suivi Technique
            </h1>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto">
              {services.map(s => {
                const isActive = serviceType === s.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/kanban/${s.id}`)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canSync && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition disabled:opacity-50 ${
                   syncing 
                   ? 'bg-blue-50 text-blue-700 border-blue-200' 
                   : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{syncing ? 'Import...' : 'Importer DT'}</span>
              </button>
            )}
            <button
              onClick={() => setOnlyMyTasks(!onlyMyTasks)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition ${
                onlyMyTasks 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <User size={16} />
              <span className="hidden sm:inline">{onlyMyTasks ? 'Mes tâches' : 'Toutes'}</span>
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* On retire overflow-y-hidden pour permettre le scrollbar horizontal standard de Trello */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#884DFF]/10 dark:bg-gray-900">
          <div className="flex h-full items-start px-4 py-4 gap-3 whitespace-nowrap">
            {displayLists?.map((list) => (
              <TrelloList 
                key={list.id} 
                list={list} 
                cards={list.cards} 
                onCardClick={handleCardClick}
                onAddCard={handleAddCard}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {selectedCard && (
        <TrelloCardModal 
          card={selectedCard} 
          serviceType={serviceType}
          onClose={() => setSelectedCard(null)} 
          onUpdate={() => fetchBoard(true)}
        />
      )}
    </div>
  );
};

export default TrelloBoard;