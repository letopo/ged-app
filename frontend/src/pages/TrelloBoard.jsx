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

const SERVICES = [
  { id: 'MG',          label: 'Moyens Généraux', icon: Wrench },
  { id: 'Biomedical',  label: 'Biomédical',       icon: HeartPulse },
  { id: 'Informatique',label: 'Informatique',      icon: Monitor },
];

const TrelloBoard = () => {
  const { serviceType } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasAccess = () => {
    if (!user) return false;
    const allowedEmails = [
      'hsjm.directeurdusoutien@gmail.com', 'hsjm.pharma@gmail.com',
      'hopitalcameroun@ordredemaltefrance.org', 'aureleyankeu@gmail.com',
      'hsjm.moyengeneraux@gmail.com', 'hsjm.celluleinformatique2@gmail.com',
      'hsjm.cellulebiomedicale@gmail.com',
    ];
    if (allowedEmails.includes(user.email)) return true;
    const userService = user.Service?.name || user.service || '';
    return ['MG', 'Moyens Généraux', 'Informatique', 'Biomédical', 'Biomedical']
      .some(s => userService.includes(s));
  };

  if (!hasAccess()) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--surface-2)',
      }}>
        <div className="ged-card" style={{ padding: '32px 28px', textAlign: 'center', maxWidth: 360 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--danger-soft)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={22} color="var(--danger)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', marginBottom: 8 }}>Accès Restreint</div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>
            Vous n'avez pas les droits pour accéder à ce tableau.
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%', height: 36, borderRadius: 'var(--radius-2)',
              border: 'none', background: 'var(--brand)', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const [boardData, setBoardData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    fetchBoard();
    const socket = getSocket();
    if (socket) {
      const refresh = () => fetchBoard(true);
      socket.on('trello_card_moved',       refresh);
      socket.on('trello_card_created',     refresh);
      socket.on('trello_card_updated',     refresh);
      socket.on('trello_comment_added',    refresh);
      socket.on('trello_attachment_added', refresh);
      socket.on('trello_refresh_needed',   refresh);
      return () => {
        socket.off('trello_card_moved',       refresh);
        socket.off('trello_card_created',     refresh);
        socket.off('trello_card_updated',     refresh);
        socket.off('trello_comment_added',    refresh);
        socket.off('trello_attachment_added', refresh);
        socket.off('trello_refresh_needed',   refresh);
      };
    }
  }, [serviceType]);

  useEffect(() => {
    if (selectedCard && boardData) {
      for (const list of boardData.lists) {
        const found = list.cards.find(c => c.id === selectedCard.id);
        if (found) { setSelectedCard(found); break; }
      }
    }
  }, [boardData]);

  const fetchBoard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await trelloAPI.getBoard(serviceType || 'MG');
      setBoardData(response.data.data);
    } catch { setError('Impossible de charger le tableau.'); }
    finally { if (!isBackground) setLoading(false); }
  };

  const handleSync = async () => {
    if (!window.confirm('Voulez-vous importer toutes les anciennes Demandes de Travaux validées ?')) return;
    try {
      setSyncing(true);
      const response = await trelloAPI.syncLegacyDocs();
      toast(response.data.message);
      fetchBoard();
    } catch { toast('Erreur lors de la synchronisation'); }
    finally { setSyncing(false); }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startList  = boardData.lists.find(l => l.id === source.droppableId);
    const finishList = boardData.lists.find(l => l.id === destination.droppableId);
    const newLists   = [...boardData.lists];
    const startCards = Array.from(startList.cards);
    const movedCard  = startCards[source.index];
    startCards.splice(source.index, 1);
    const finishCards = source.droppableId === destination.droppableId ? startCards : Array.from(finishList.cards);
    finishCards.splice(destination.index, 0, movedCard);
    startList.cards  = startCards;
    finishList.cards = finishCards;
    setBoardData({ ...boardData, lists: newLists });

    try {
      await trelloAPI.moveCard(draggableId, { newListId: destination.droppableId, newPosition: destination.index * 1000 + 500 });
    } catch { fetchBoard(true); }
  };

  const handleAddCard = async (listId, title) => {
    if (title) {
      await trelloAPI.createCard({ listId, title, priority: 'medium', description: '' });
      fetchBoard(true);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Loader size={28} color="var(--brand)" className="animate-spin" />
    </div>
  );
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 8, color: 'var(--danger)' }}>
      <AlertTriangle size={18} /> {error}
    </div>
  );

  const displayLists = boardData?.lists.map(list => ({
    ...list,
    cards: onlyMyTasks ? list.cards.filter(c => c.assignedTo === user.id) : list.cards,
  }));

  const canSync = ['admin', 'director', 'validator'].includes(user?.role);

  const tabBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 'var(--radius-2)',
    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--fg)' : 'var(--fg-muted)',
    boxShadow: active ? 'var(--shadow-1)' : 'none',
    transition: 'all .12s', whiteSpace: 'nowrap',
  });

  const outlineBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    height: 32, padding: '0 12px', borderRadius: 'var(--radius-2)',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
    background: active ? 'var(--brand-soft)' : 'var(--surface)',
    color: active ? 'var(--brand)' : 'var(--fg-muted)',
    fontSize: 13, fontWeight: active ? 500 : 400, cursor: 'pointer',
    transition: 'all .12s',
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', flexShrink: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', display: 'none' }}>Suivi Technique</span>

          {/* Service tabs */}
          <div style={{
            display: 'flex', gap: 2, padding: 3,
            background: 'var(--surface-2)', borderRadius: 'var(--radius-2)',
          }}>
            {SERVICES.map(s => {
              const isActive = serviceType === s.id;
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => navigate(`/kanban/${s.id}`)} style={tabBtn(isActive)}>
                  <Icon size={14} color={isActive ? 'var(--brand)' : 'var(--fg-subtle)'} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {canSync && (
            <button onClick={handleSync} disabled={syncing} style={{ ...outlineBtn(syncing), opacity: syncing ? 0.7 : 1 }}>
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Import…' : 'Importer DT'}</span>
            </button>
          )}
          <button onClick={() => setOnlyMyTasks(!onlyMyTasks)} style={outlineBtn(onlyMyTasks)}>
            <User size={13} />
            <span>{onlyMyTasks ? 'Mes tâches' : 'Toutes'}</span>
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', background: 'var(--brand-soft)' }}>
          <div style={{ display: 'flex', height: '100%', alignItems: 'flex-start', padding: '12px', gap: 10, minWidth: 'max-content' }}>
            {displayLists?.map(list => (
              <TrelloList
                key={list.id}
                list={list}
                cards={list.cards}
                onCardClick={card => setSelectedCard(card)}
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
