import React, { useState, useRef, useEffect } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TrelloCard from './TrelloCard';
import { Plus, MoreHorizontal, X, ArrowLeftToLine, ArrowRightToLine, Copy, Archive, ArrowRight } from 'lucide-react';

const TrelloList = ({ list, cards, onCardClick, onAddCard }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // État pour le menu
  const menuRef = useRef(null);
  const textareaRef = useRef(null);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
    }
  }, [isAdding]);

  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    setNewCardTitle(e.target.value);
  };

  const handleSubmit = async () => {
    if (!newCardTitle.trim()) return;
    await onAddCard(list.id, newCardTitle);
    setNewCardTitle("");
    setIsAdding(true);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') setIsAdding(false);
  };

  // --- RENDU RÉDUIT ---
  if (isCollapsed) {
    return (
      <div className="flex flex-col w-12 h-full bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0 cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-700">
        <div onClick={() => setIsCollapsed(false)} className="flex-1 flex flex-col items-center py-4 gap-4">
            <ArrowRightToLine size={20} className="text-gray-600 dark:text-gray-300" />
            <div className="flex-1 w-full flex items-center justify-center">
                <span className="font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap text-lg" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    {list.name}
                </span>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-1.5 py-0.5 rounded-full mb-2">{cards.length}</span>
        </div>
      </div>
    );
  }

  // --- RENDU COMPLET ---
  return (
    <div className="flex flex-col w-72 max-h-full bg-[#f1f2f4] dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-shrink-0 relative">
      
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between gap-2 cursor-pointer group relative">
        <div className="flex-1 font-semibold text-sm text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 truncate">
          {list.name}
        </div>
        
        <div className="flex items-center gap-1">
            {/* Bouton Réduire */}
            <button onClick={() => setIsCollapsed(true)} className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition">
                <ArrowLeftToLine size={16} />
            </button>
            
            {/* Bouton Menu Actions */}
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition"
                >
                    <MoreHorizontal size={16} />
                </button>

                {/* MENU DÉROULANT TYPE TRELLO */}
                {showMenu && (
                    <div className="absolute right-0 top-8 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-2">
                        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Liste des actions</span>
                            <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </div>
                        
                        <ul className="text-sm text-gray-700 dark:text-gray-300">
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2" onClick={() => { setIsAdding(true); setShowMenu(false); }}>
                                    <Plus size={14} /> Ajouter une carte
                                </button>
                            </li>
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Copy size={14} /> Copier la liste
                                </button>
                            </li>
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <ArrowRight size={14} /> Déplacer la liste
                                </button>
                            </li>
                            <li className="border-t border-gray-100 dark:border-gray-700 my-1"></li>
                            <li>
                                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600">
                                    <Archive size={14} /> Archiver cette liste
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Cartes */}
      <Droppable droppableId={list.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`flex-1 px-2 py-1 overflow-y-auto min-h-[50px] custom-scrollbar ${snapshot.isDraggingOver ? 'bg-gray-200/50 dark:bg-gray-700/50' : ''}`}
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {cards.map((card, index) => (
              <TrelloCard key={card.id} card={{...card, listName: list.name}} index={index} onClick={onCardClick} />
            ))}
            {provided.placeholder}
            
            {/* Input Ajout Carte */}
            {isAdding && (
                <div className="mb-2">
                    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 p-2 mb-2">
                        <textarea
                            ref={textareaRef}
                            value={newCardTitle}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Saisissez un titre pour cette carte..."
                            className="w-full resize-none text-sm bg-transparent border-none focus:ring-0 p-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 min-h-[60px] overflow-hidden"
                            rows={1}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSubmit} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition shadow-sm">
                            Ajouter une carte
                        </button>
                        <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-800 p-1.5 hover:bg-gray-200 rounded transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}
      </Droppable>

      {!isAdding && (
        <div className="p-2 pt-1">
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Ajouter une carte
          </button>
        </div>
      )}
    </div>
  );
};

export default TrelloList;