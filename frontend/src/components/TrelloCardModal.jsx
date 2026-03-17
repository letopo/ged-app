import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CreditCard, AlignLeft, CheckSquare, Clock, Tag, User, 
  Paperclip, Trash2, Activity, Send, Check, Plus, ArrowRight, 
  Copy, Calendar, Image as ImageIcon, Link as LinkIcon, MapPin,
  Bold, Italic, List, ListOrdered, AtSign, Smile, Eye, Box,
  MessageSquare, ThumbsUp, Share2, Bell, Pin, StickyNote, RotateCcw, Edit2,
  ChevronLeft, ChevronRight, UserPlus
} from 'lucide-react';
import { trelloAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { timeAgo } from '../utils/dateUtils'; // Assurez-vous d'avoir cette fonction

// --- COMPOSANT : Sélecteur d'Emoji (Mock) ---
// Note: Dans un vrai projet, vous utiliseriez une librairie comme emoji-mart.
const ReactionPicker = ({ onSelectEmoji, onClose }) => {
    const mockReactions = [
        { id: 'happy', icon: '😄' }, { id: 'thumb', icon: '👍' }, 
        { id: 'heart', icon: '❤️' }, { id: 'tada', icon: '🎉' },
        { id: 'cry', icon: '😢' }, { id: 'rofl', icon: '🤣' }
    ];
    
    return (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="text-xs font-semibold text-gray-500 pb-2 border-b dark:border-gray-700 flex justify-between">
                Ajouter une réaction
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            
            <div className="flex flex-wrap gap-2 text-2xl cursor-pointer pt-2">
                {mockReactions.map(emoji => (
                    <span 
                        key={emoji.id} 
                        onClick={() => onSelectEmoji(emoji.icon)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-1 transition"
                    >
                        {emoji.icon}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- COMPOSANT : Éditeur de Commentaires (Toolbar & Input) ---

const CommentEditor = ({ comment, setComment, handleSaveComment, handleCancelEdit, user, showDetails, isEditing, commentId, isNewComment, handleInsertEmoji }) => {
  const commentInputRef = useRef(null);

  useEffect(() => {
    if ((isEditing || isNewComment) && commentInputRef.current) {
        commentInputRef.current.focus();
        if (isEditing) {
            commentInputRef.current.setSelectionRange(comment.length, comment.length);
        }
    }
  }, [isEditing, isNewComment]);

  const handleCommentSave = () => {
    handleSaveComment(commentId, comment);
  };

  const avatarContent = (
    <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
      F
    </div>
  );
  
  return (
    <div className="flex gap-3 mb-6">
      <div className="w-9 h-9 rounded-full flex-shrink-0 mt-1 overflow-hidden">
        {avatarContent}
      </div>
      
      <div className="flex-1">
        {isEditing && (
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Franck YANKEU
            </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">
          {showDetails && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="px-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Aa</span>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Gras">
                <Bold size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Italique">
                <Italic size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Liste à puces">
                <List size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Liste numérotée">
                <ListOrdered size={16} />
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Plus">
                <Plus size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Pièce jointe">
                <Paperclip size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Lien">
                <LinkIcon size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Mention">
                <AtSign size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Emoji">
                <Smile size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" title="Prévisualiser">
                <Eye size={16} />
              </button>
            </div>
          )}
          <textarea 
            ref={commentInputRef}
            className="w-full p-3 bg-transparent text-gray-800 dark:text-gray-200 text-sm min-h-[80px] resize-none outline-none"
            placeholder="Écrivez un commentaire..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 mt-2">
            <button 
              onClick={handleCommentSave} 
              disabled={!comment.trim()}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                comment.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
            Enregistrer
            </button>
            
          {isEditing && (
              <button 
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
              Annuler
              </button>
            )}

            {isNewComment && (
                <div className="flex gap-2 ml-auto">
                    <button 
                onClick={() => handleInsertEmoji('😀')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition" 
                        title="Emoji"
                    >
                        <Smile size={16} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition" title="Pièce jointe">
                        <Paperclip size={16} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition" title="Mentionner">
                        <AtSign size={16} />
                    </button>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};


// --- NOUVEAU COMPOSANT : Liste des Commentaires/Activité ---

const CommentList = ({ activities, user, setEditingComment, setDeletingCommentId, toggleEmojiPicker }) => {
  if (!activities) return null;

  const sortedComments = activities.filter(item => item.id !== 'initial-activity' && item.text !== undefined);
  
  // Activité initiale mockée pour l'exemple
  const initialActivity = {
    id: 'initial-activity',
    type: 'card_creation',
    authorName: 'Aurele Franck YANKEU',
    createdAt: '2025-12-05T13:09:00Z', 
    text: `a ajouté cette carte à Aujourd'hui`,
  };

  const combinedActivities = [...sortedComments, initialActivity].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return (
    <div className="space-y-4">
      {combinedActivities.map((item) => (
        <div key={item.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full flex-shrink-0 mt-1">
             <img src="https://i.pravatar.cc/150?img=1" alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{item.authorName}</span>
              <span className="text-xs text-gray-500">
                {item.type === 'card_creation' 
                  ? `5 déc. 2025 à 13:09` 
                  : timeAgo(item.createdAt) || 'il y a 18 secondes'}
              </span>
            </div>
            
            {item.type !== 'card_creation' ? (
              <div className="text-sm text-gray-700 dark:text-gray-300 relative -mt-1">
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                    {item.text || 'test'}
                </div>
                
                {(item.reactions?.length > 0 || item.id === 'initial-comment') && (
                    <div className="absolute -bottom-3 left-1 flex gap-1">
                        <div 
                            onClick={() => toggleEmojiPicker(item.id)}
                            className="flex items-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full pl-2 pr-1.5 py-0.5 shadow-sm text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                            <span className="text-sm mr-1">😄</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">1</span>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-2 mt-4 text-gray-500 dark:text-gray-400">
                    <button 
                        onClick={() => toggleEmojiPicker(item.id)}
                        className="text-xs hover:text-gray-700 dark:hover:text-gray-200 flex items-center p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        title="Ajouter une réaction"
                    >
                        <Smile size={14} />
                    </button>
                    
                    <button 
                      onClick={() => setEditingComment(item)}
                      className="text-xs hover:underline"
                    >
                      Modifier
                    </button>
                    <span>•</span>
                    <button 
                      onClick={() => setDeletingCommentId(item.id)}
                      className="text-xs hover:underline"
                    >
                      Supprimer
                    </button>
                </div>
              </div>
            ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {item.text}
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Popover "Ajouter" (actions rapides)
const AddPopover = ({ innerRef, position, onClose, onOpenLabels, onOpenDates, onOpenChecklist }) => {
  const items = [
    { icon: Tag, label: 'Étiquettes', desc: 'Organisez, répertoriez et classez par ordre de priorité', action: 'labels' },
    { icon: Clock, label: 'Dates', desc: 'Dates de début, dates d’échéance et rappels', action: 'dates' },
    { icon: CheckSquare, label: 'Checklist', desc: 'Ajouter des sous-tâches', action: 'checklist' },
    { icon: User, label: 'Membres', desc: 'Attribuer des membres' },
    { icon: Paperclip, label: 'Pièce jointe', desc: 'Ajouter des liens, des pages, des tickets, etc.' },
    { icon: MapPin, label: 'Emplacement', desc: 'Afficher cette carte sur un plan' },
    { icon: StickyNote, label: 'Champs personnalisés', desc: 'Créer vos propres champs' },
  ];

  const style = position
    ? { top: position.top, left: position.left }
    : { top: 80, left: 80 };

  return (
    <div
      ref={innerRef}
      style={style}
      className="fixed z-[12000] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ajouter à la carte</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {items.map(({ icon: Icon, label, desc, action }) => (
          <button
            key={label}
            onClick={() => {
              if (action === 'labels' && onOpenLabels) onOpenLabels();
              if (action === 'dates' && onOpenDates) onOpenDates();
              if (action === 'checklist' && onOpenChecklist) onOpenChecklist();
            }}
            className="w-full flex items-start gap-3 py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-left transition"
          >
            <div className="mt-0.5 text-gray-600 dark:text-gray-300"><Icon size={20} /></div>
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Popover "Étiquettes"
const LabelsPopover = ({ innerRef, position, colors = [], selected = [], onToggle, onClose }) => {
  const style = position
    ? { top: position.top, left: position.left }
    : { top: 80, left: 80 };

  return (
    <div
      ref={innerRef}
      style={style}
      className="fixed z-[12000] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <Tag size={18} />
          <span>Étiquettes</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <input
        className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Parcourir les étiquettes..."
      />

      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1 mb-2">Étiquettes</div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {colors.map((c) => {
          const checked = selected.some((l) => l.color === c.color);
          return (
          <div
            key={c.color}
            className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(c)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className={`h-8 flex-1 rounded ${c.color}`}></div>
            <button className="text-gray-400 hover:text-gray-600">
              <Edit2 size={16} />
            </button>
          </div>
        )})}
      </div>

      <button className="w-full mt-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 transition">
        Créer une nouvelle étiquette
      </button>

      <button className="w-full mt-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition">
        Activer la version pour personnes daltoniennes
      </button>
    </div>
  );
};

// Popover "Dates"
const DatesPopover = ({
  innerRef,
  position,
  onClose,
  month,
  year,
  startDate,
  dueDate,
  dueTime,
  recurrence,
  reminder,
  onChangeStart,
  onChangeDue,
  onChangeTime,
  onChangeRecurrence,
  onChangeReminder,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  onSave,
  onClear
}) => {
  const style = position
    ? { top: position.top, left: position.left }
    : { top: 80, left: 80 };

  const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div
      ref={innerRef}
      style={style}
      className="fixed z-[12000] w-[320px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <button className="text-gray-500 hover:text-gray-700" onClick={onPrevMonth}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {monthNames[month]} {year}
        </div>
        <button className="text-gray-500 hover:text-gray-700" onClick={onNextMonth}>
          <ChevronRight size={18} />
        </button>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
        {['lun','mar','mer','jeu','ven','sam','dim'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm mb-3">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => onSelectDay && onSelectDay(d)}
            className="py-2 rounded hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            {d}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Date de début</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={startDate}
              onChange={(e) => onChangeStart(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              placeholder="JJ/MM/AAAA"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Date limite</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={dueDate}
              onChange={(e) => onChangeDue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              placeholder="JJ/MM/AAAA"
            />
            <input
              value={dueTime}
              onChange={(e) => onChangeTime(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              placeholder="HH:MM"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Récurrent</label>
          <select
            value={recurrence}
            onChange={(e) => onChangeRecurrence(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            <option value="never">Jamais</option>
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Définir un rappel</label>
          <select
            value={reminder}
            onChange={(e) => onChangeReminder(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
          >
            <option value="none">Aucun</option>
            <option value="5m">5 minutes avant</option>
            <option value="1h">1 heure avant</option>
            <option value="1d">1 jour avant</option>
          </select>
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
      >
        Enregistrer
      </button>
      <button
        onClick={onClear}
        className="w-full mt-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition"
      >
        Effacer
      </button>
    </div>
  );
};

// Popover "Ajouter une checklist"
const ChecklistPopover = ({
  innerRef,
  position,
  title,
  onChangeTitle,
  onSelectSuggestion,
  onSubmit,
  onClose
}) => {
  const style = position
    ? { top: position.top, left: position.left }
    : { top: 80, left: 80 };

  const suggestions = ['Barre de navigation', 'Planificateur'];

  return (
    <div
      ref={innerRef}
      style={style}
      className="fixed z-[12000] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Ajouter une checklist</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Suggestions</div>
      <div className="space-y-2 mb-3">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelectSuggestion(s)}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Titre</label>
        <input
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Checklist"
        />
      </div>

      <button
        onClick={onSubmit}
        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
      >
        Ajouter
      </button>
    </div>
  );
};


// --- COMPOSANT PRINCIPAL : TrelloCardModal ---

const TrelloCardModal = ({ card, serviceType, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [currentCard, setCurrentCard] = useState(card);
  const [description, setDescription] = useState(card.description || '');
  
  // Commentaire en cours d'écriture (nouvel ajout)
  const [newCommentText, setNewCommentText] = useState(''); 
  
  // Nouveaux états pour l'interactivité des commentaires
  const [editingComment, setEditingComment] = useState(null); 
  const [editedCommentText, setEditedCommentText] = useState(''); 
  const [deletingCommentId, setDeletingCommentId] = useState(null); 
  const [showEmojiPickerId, setShowEmojiPickerId] = useState(null); 
  
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title || '');
  const [showCommentSidebar, setShowCommentSidebar] = useState(true);
  const [showCommentSidebarDetails, setShowCommentSidebarDetails] = useState(true); 
  
  const popoverRef = useRef(null);
  const reactionPickerRef = useRef(null); // RENOMMÉ pour la clarté (était emojiPickerRef)
  const titleInputRef = useRef(null);
  const addButtonRef = useRef(null);
  const [addPopoverPos, setAddPopoverPos] = useState(null);
  const labelsButtonRef = useRef(null);
  const [labelsPopoverPos, setLabelsPopoverPos] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState(card.labels || []);
  const datesButtonRef = useRef(null);
  const [datesPopoverPos, setDatesPopoverPos] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(card?.dates?.startDate || '');
  const [dueDate, setDueDate] = useState(card?.dates?.dueDate || '');
  const [dueTime, setDueTime] = useState(card?.dates?.dueTime || '');
  const [recurrence, setRecurrence] = useState(card?.dates?.recurrence || 'never');
  const [reminder, setReminder] = useState(card?.dates?.reminder || 'none');
  const checklistButtonRef = useRef(null);
  const [checklistPopoverPos, setChecklistPopoverPos] = useState(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState('Checklist');
  const [itemDrafts, setItemDrafts] = useState({});
  const [deletingChecklistId, setDeletingChecklistId] = useState(null);
  const [showAssignPopoverId, setShowAssignPopoverId] = useState(null);
  const handleToggleLabel = (label) => {
    setSelectedLabels((prev) => {
      const exists = prev.some((l) => l.color === label.color);
      // NOTE: Le label doit être un objet { color: '...', name: '...' } pour le state
      const updated = exists ? prev.filter((l) => l.color !== label.color) : [...prev, label];
      
      // Mettre à jour l'état de la carte (Important pour la fermeture du modal)
      setCurrentCard((c) => ({ ...c, labels: updated }));
      
      // Persist
      try {
        // Dans l'API, vous pourriez n'envoyer que les noms ou les couleurs, ajustez selon votre API.
        // Ici, j'envoie l'objet label complet pour la cohérence de l'état.
        trelloAPI.updateCard(currentCard.id, { labels: updated });
        onUpdate(); // Déclencher la mise à jour de la liste parente
      } catch (err) {
        console.error('Erreur lors de la mise à jour des étiquettes', err);
      }
      return updated;
    });
  };

  const handleSaveDates = async () => {
    const datesPayload = { startDate, dueDate, dueTime, recurrence, reminder };
    setCurrentCard((c) => ({ ...c, dates: datesPayload }));
    setActivePopover(null);
    try {
      await trelloAPI.updateCard(currentCard.id, { dates: datesPayload });
      onUpdate(); // Déclencher la mise à jour de la liste parente
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des dates', err);
    }
  };

  const handleClearDates = async () => {
    setStartDate('');
    setDueDate('');
    setDueTime('');
    setRecurrence('never');
    setReminder('none');
    setCurrentCard((c) => ({ ...c, dates: {} }));
    setActivePopover(null);
    try {
      await trelloAPI.updateCard(currentCard.id, { dates: {} });
    } catch (err) {
      console.error('Erreur lors de la réinitialisation des dates', err);
    }
  };

  const parseDateString = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map((v) => parseInt(v, 10));
    if (!d || !m || !y) return null;
    return { d, m: m - 1, y };
  };

  const setCalendarFromDate = (str) => {
    const parsed = parseDateString(str);
    if (parsed) {
      setCalendarMonth(parsed.m);
      setCalendarYear(parsed.y);
    } else {
      const now = new Date();
      setCalendarMonth(now.getMonth());
      setCalendarYear(now.getFullYear());
    }
  };

  const parseDueDateTime = () => {
    const parsed = parseDateString(dueDate);
    if (!parsed) return null;
    const [hh = 0, mm = 0] = (dueTime || '00:00').split(':').map((v) => parseInt(v, 10));
    const dt = new Date(parsed.y, parsed.m, parsed.d, hh || 0, mm || 0);
    return dt;
  };

  const dueInfo = (() => {
    const dt = parseDueDateTime();
    if (!dt) return null;
    const now = new Date();
    const diff = dt.getTime() - now.getTime();
    const isPast = diff < 0;
    const isSoon = diff >= 0 && diff < 36 * 60 * 60 * 1000; // ~1.5 day
    const status = isPast ? 'En retard' : isSoon ? 'Dû prochainement' : 'Dû plus tard';
    const color =
      isPast ? 'bg-red-100 text-red-800' : isSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
    const formatted = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} à ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return { formatted, status, color };
  })();

  const handleAddChecklist = async () => {
    const title = newChecklistTitle?.trim() || 'Checklist';
    // Utiliser un format de date pour un ID plus unique/robuste si Date.now() n'est pas suffisant
    const newChecklist = { id: Date.now().toString(), title, items: [] }; 
    const updated = [...checklists, newChecklist];
    
    setChecklists(updated);
    setCurrentCard((c) => ({ ...c, checklists: updated }));
    setNewChecklistTitle('Checklist');
    setActivePopover(null);
    try {
      await trelloAPI.updateCard(currentCard.id, { checklists: updated });
      onUpdate(); // Déclencher la mise à jour de la liste parente
    } catch (err) {
      console.error('Erreur lors de l’ajout de checklist', err);
    }
  };

  const handleAddChecklistItem = async (checklistId) => {
    const draft = itemDrafts[checklistId]?.trim();
    if (!draft) return;
    const updated = checklists.map((cl) =>
      cl.id === checklistId
        ? { ...cl, items: [...(cl.items || []), { id: Date.now().toString(), text: draft, done: false }] }
        : cl
    );
    setChecklists(updated);
    setCurrentCard((c) => ({ ...c, checklists: updated }));
    setItemDrafts((d) => ({ ...d, [checklistId]: '' }));
    try {
      await trelloAPI.updateCard(currentCard.id, { checklists: updated });
    } catch (err) {
      console.error('Erreur lors de l’ajout d’élément de checklist', err);
    }
  };

  const handleToggleChecklistItem = async (checklistId, itemId) => {
    const updated = checklists.map((cl) => {
      if (cl.id !== checklistId) return cl;
      return {
        ...cl,
        items: (cl.items || []).map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
      };
    });
    setChecklists(updated);
    setCurrentCard((c) => ({ ...c, checklists: updated }));
    try {
      await trelloAPI.updateCard(currentCard.id, { checklists: updated });
    } catch (err) {
      console.error('Erreur lors du toggle item', err);
    }
  };

  const handleDeleteChecklist = async () => {
    if (!deletingChecklistId) return;
    const updated = checklists.filter((cl) => cl.id !== deletingChecklistId);
    setChecklists(updated);
    setCurrentCard((c) => ({ ...c, checklists: updated }));
    setDeletingChecklistId(null);
    try {
      await trelloAPI.updateCard(currentCard.id, { checklists: updated });
    } catch (err) {
      console.error('Erreur lors de la suppression de checklist', err);
    }
  };

  
  const [checklists, setChecklists] = useState(card.checklists || []);
  // ... [Couleurs d'étiquettes Trello, etc. non modifiés]
  const availableColors = [
    { color: 'bg-green-500', name: 'Vert', hex: '#61BD4F' },
    { color: 'bg-yellow-400', name: 'Jaune', hex: '#F2D600' },
    { color: 'bg-orange-400', name: 'Orange', hex: '#FF9F1A' },
    { color: 'bg-red-500', name: 'Rouge', hex: '#EB5A46' },
    { color: 'bg-purple-500', name: 'Violet', hex: '#C377E0' },
    { color: 'bg-blue-500', name: 'Bleu', hex: '#0079BF' },
    { color: 'bg-sky-400', name: 'Ciel', hex: '#00C2E0' },
    { color: 'bg-lime-500', name: 'Citron', hex: '#51E898' },
    { color: 'bg-pink-400', name: 'Rose', 'hex': '#FF78CB' },
    { color: 'bg-gray-700', name: 'Noir', hex: '#344563' },
  ];
  const [activePopover, setActivePopover] = useState(null);


  // Initialisation du texte édité lors de l'activation du mode édition
  useEffect(() => {
      if (editingComment) {
          setEditedCommentText(editingComment.text);
          setNewCommentText(''); // S'assurer que le nouvel éditeur est vide
      } else {
          setEditedCommentText('');
      }
  }, [editingComment]);
  
  // Fermer les popovers au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fermer le sélecteur de réactions
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowEmojiPickerId(null);
      }
      // Fermer les autres popovers
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleSaveDescription = async () => {
    try {
      if (description !== currentCard.description) {
        await trelloAPI.updateCard(currentCard.id, { description });
        setCurrentCard((c) => ({ ...c, description }));
        onUpdate();
      }
      setIsEditingDesc(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la description', err);
      // Optionnel: Réinitialiser l'état local en cas d'échec
      setDescription(currentCard.description || '');
      setIsEditingDesc(false);
    }
  };

  const handleSaveTitle = async () => {
    try {
      if (title.trim() && title !== currentCard.title) {
        await trelloAPI.updateCard(currentCard.id, { title });
        setCurrentCard((c) => ({ ...c, title }));
        onUpdate();
      }
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du titre', err);
      // Optionnel: Réinitialiser l'état local en cas d'échec
      setTitle(currentCard.title || '');
      setIsEditingTitle(false);
    }
  };

  // --- LOGIQUE DES COMMENTAIRES CENTRALISÉE ---

  const handleSaveComment = async (commentId, text) => {
    if (!text.trim()) return;

    if (commentId) {
        // MODE MODIFICATION
        try {
            // L'API attend { content: text }
            const res = await trelloAPI.updateComment(commentId, { content: text }); 
            
            const updatedComments = currentCard.comments.map(com => 
                com.id === commentId ? res.data.data : com // Utiliser la donnée renvoyée par le backend
            );
            setCurrentCard(prev => ({...prev, comments: updatedComments}));
            setEditingComment(null);
            
        } catch (err) {
            console.error('Erreur lors de la modification du commentaire', err);
        }
        
    } else {
        // MODE NOUVEAU COMMENTAIRE
        try {
            // L'API attend { content: text }
            const res = await trelloAPI.addComment(currentCard.id, { content: text }); 
            
            // Le backend renvoie le fullComment, l'ajouter à l'état local
            setCurrentCard(prev => ({
                ...prev,
                comments: prev.comments ? [...prev.comments, res.data.data] : [res.data.data]
            }));
            setNewCommentText('');

        } catch (err) {
            console.error('Erreur lors de l\'ajout du commentaire', err);
        }
    }
};

  const handleCancelEdit = () => {
      setEditingComment(null);
      setNewCommentText('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCommentId) return;
    
    try {
        await trelloAPI.deleteComment(deletingCommentId); 
        
        // Mise à jour de l'état local après succès de l'API
        const updatedComments = currentCard.comments.filter(com => com.id !== deletingCommentId);
        setCurrentCard(prev => ({...prev, comments: updatedComments}));
        
    } catch (err) {
        console.error('Erreur lors de la suppression du commentaire', err);
    }
    setDeletingCommentId(null);
};

  
  const toggleEmojiPicker = (id) => {
      setShowEmojiPickerId(showEmojiPickerId === id ? null : id);
  };
  
  const handleInsertEmoji = (emoji) => {
      // Pour l'éditeur de nouveau/modification, insérer l'emoji dans le texte
      if (editingComment) {
          setEditedCommentText(prev => prev + emoji);
      } else {
          setNewCommentText(prev => prev + emoji);
      }
      setShowEmojiPickerId(null); // Fermer après insertion si ouvert
  };
  
  const handleSelectReaction = (emoji) => {
      // Pour la réaction d'un commentaire existant
      if (showEmojiPickerId && showEmojiPickerId !== 'new') {
         // Logique d'ajout de réaction à un commentaire existant
         console.log(`Ajouter la réaction: ${emoji} au commentaire ID: ${showEmojiPickerId}`);
      }
      setShowEmojiPickerId(null);
  };


  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex justify-center items-start overflow-y-auto pt-16" onClick={onClose}>
      <div 
        className="relative bg-white dark:bg-gray-900 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* CONTENU PRINCIPAL AVEC SIDEBAR */}
        <div className="flex flex-1 overflow-hidden">
          {/* CONTENU PRINCIPAL (gauche) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TITRE + ACTIONS */}
            <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {isEditingTitle ? (
                <input 
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-blue-500 px-1 py-2 w-full outline-none"
                  placeholder="Titre de la carte"
                />
              ) : (
                <h2 
                  onClick={() => setIsEditingTitle(true)}
                  className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-3 py-2 -ml-3 transition"
                >
                  {currentCard.title || "Carte sans titre"}
                </h2>
              )}
              <div className="text-sm text-gray-500 mt-1 ml-3">
                dans <span className="font-medium underline cursor-pointer">{card.listName || '...'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <Bell size={20} />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <Pin size={20} />
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <X size={20} />
              </button>
          </div>
        </div>

          <div className="flex flex-wrap items-center gap-2">
            
                <div className="relative">
            <button 
                    ref={addButtonRef}
                    onClick={() => {
                      if (activePopover === 'add') {
                        setActivePopover(null);
                        return;
                      }
                      if (addButtonRef.current) {
                        const rect = addButtonRef.current.getBoundingClientRect();
                        const left = Math.min(rect.left, window.innerWidth - 340);
                        setAddPopoverPos({ top: rect.bottom + 8, left });
                      }
                      setActivePopover('add');
                    }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition"
            >
              <Plus size={16} />
              <span>Ajouter</span>
            </button>
                  {activePopover === 'add' && (
                    <AddPopover 
                      innerRef={popoverRef} 
                      position={addPopoverPos} 
                      onClose={() => setActivePopover(null)}
                      onOpenLabels={() => {
                        setActivePopover(null);
                        if (labelsButtonRef.current) {
                          const rect = labelsButtonRef.current.getBoundingClientRect();
                          const left = Math.min(rect.left, window.innerWidth - 340);
                          setLabelsPopoverPos({ top: rect.bottom + 8, left });
                        }
                        setActivePopover('labels');
                      }}
                      onOpenDates={() => {
                        setActivePopover(null);
                        setCalendarFromDate(dueDate || startDate);
                        if (datesButtonRef.current) {
                          const rect = datesButtonRef.current.getBoundingClientRect();
                          const left = Math.min(rect.left, window.innerWidth - 360);
                          setDatesPopoverPos({ top: rect.bottom + 8, left });
                        }
                        setActivePopover('dates');
                      }}
                      onOpenChecklist={() => {
                        setActivePopover(null);
                        if (checklistButtonRef.current) {
                          const rect = checklistButtonRef.current.getBoundingClientRect();
                          const left = Math.min(rect.left, window.innerWidth - 320);
                          setChecklistPopoverPos({ top: rect.bottom + 8, left });
                        }
                        setActivePopover('checklist');
                      }}
                    />
                  )}
                </div>

            <div className="relative">
              <button 
                    ref={labelsButtonRef}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover_bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition"
                    onClick={() => {
                      if (activePopover === 'labels') {
                        setActivePopover(null);
                        return;
                      }
                      if (labelsButtonRef.current) {
                        const rect = labelsButtonRef.current.getBoundingClientRect();
                        const left = Math.min(rect.left, window.innerWidth - 340);
                        setLabelsPopoverPos({ top: rect.bottom + 8, left });
                      }
                      setActivePopover('labels');
                    }}
              >
                <Tag size={16} />
                <span>Étiquettes</span>
                {currentCard.labels?.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                    {currentCard.labels.length}
                  </span>
                )}
              </button>
                  {activePopover === 'labels' && (
                    <LabelsPopover 
                      innerRef={popoverRef} 
                      position={labelsPopoverPos} 
                      colors={availableColors} 
                      selected={selectedLabels}
                      onToggle={handleToggleLabel}
                      onClose={() => setActivePopover(null)} 
                    />
                  )}
            </div>
            
                <div className="relative">
            <button 
                    ref={datesButtonRef}
                    onClick={() => {
                      if (activePopover === 'dates') {
                        setActivePopover(null);
                        return;
                      }
                      setCalendarFromDate(dueDate || startDate);
                      if (datesButtonRef.current) {
                        const rect = datesButtonRef.current.getBoundingClientRect();
                        const left = Math.min(rect.left, window.innerWidth - 360);
                        setDatesPopoverPos({ top: rect.bottom + 8, left });
                      }
                      setActivePopover('dates');
                    }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition"
            >
              <Clock size={16} />
              <span>Dates</span>
            </button>
                  {activePopover === 'dates' && (
                    <DatesPopover
                      innerRef={popoverRef}
                      position={datesPopoverPos}
                      month={calendarMonth}
                      year={calendarYear}
                      startDate={startDate}
                      dueDate={dueDate}
                      dueTime={dueTime}
                      recurrence={recurrence}
                      reminder={reminder}
                      onChangeStart={setStartDate}
                      onChangeDue={setDueDate}
                      onChangeTime={setDueTime}
                      onChangeRecurrence={setRecurrence}
                      onChangeReminder={setReminder}
                      onPrevMonth={() => {
                        setCalendarMonth((m) => (m === 0 ? 11 : m - 1));
                        setCalendarYear((y) => (calendarMonth === 0 ? y - 1 : y));
                      }}
                      onNextMonth={() => {
                        setCalendarMonth((m) => (m === 11 ? 0 : m + 1));
                        setCalendarYear((y) => (calendarMonth === 11 ? y + 1 : y));
                      }}
                      onSelectDay={(day) => {
                        const mm = String(calendarMonth + 1).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        setDueDate(`${dd}/${mm}/${calendarYear}`);
                      }}
                      onSave={handleSaveDates}
                      onClear={handleClearDates}
                      onClose={() => setActivePopover(null)}
                    />
                  )}
                </div>
                
                <div className="relative">
            <button 
                    ref={checklistButtonRef}
                    onClick={() => {
                      if (activePopover === 'checklist') {
                        setActivePopover(null);
                        return;
                      }
                      if (checklistButtonRef.current) {
                        const rect = checklistButtonRef.current.getBoundingClientRect();
                        const left = Math.min(rect.left, window.innerWidth - 320);
                        setChecklistPopoverPos({ top: rect.bottom + 8, left });
                      }
                      setActivePopover('checklist');
                    }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition"
            >
              <CheckSquare size={16} />
              <span>Checklist</span>
            </button>
                  {activePopover === 'checklist' && (
                    <ChecklistPopover
                      innerRef={popoverRef}
                      position={checklistPopoverPos}
                      title={newChecklistTitle}
                      onChangeTitle={setNewChecklistTitle}
                      onSelectSuggestion={(s) => setNewChecklistTitle(s)}
                      onSubmit={handleAddChecklist}
                      onClose={() => setActivePopover(null)}
                    />
                  )}
                </div>
                
            <button 
              onClick={() => setActivePopover('members')} // À développer : popover des membres
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray700 dark:text-gray-300 transition"
            >
              <User size={16} />
              <span>Membres</span>
            </button>
          </div>

              {dueInfo && (
                <div className="mt-3 ml-1 flex items-center gap-3">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">Date limite</div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{dueInfo.formatted}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${dueInfo.color}`}>
                      {dueInfo.status}
                    </span>
                    <button
                      onClick={() => {
                        setCalendarFromDate(dueDate || startDate);
                        if (datesButtonRef.current) {
                          const rect = datesButtonRef.current.getBoundingClientRect();
                          const left = Math.min(rect.left, window.innerWidth - 360);
                          setDatesPopoverPos({ top: rect.bottom + 8, left });
                        }
                        setActivePopover('dates');
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
        </div>
            
            {/* DESCRIPTION (non modifiée) */}
            <div className="mb-8">
                {/* ... (votre code pour la description) ... */}
              <div className="flex items-center gap-3 mb-4">
                <AlignLeft className="text-gray-600 dark:text-gray-400" size={20} />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Description</h3>
                {!isEditingDesc && (
                  <button 
                    onClick={() => setIsEditingDesc(true)} 
                    className="ml-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition"
                  >
                    Modifier
                  </button>
                )}
              </div>
              
              {isEditingDesc ? (
                <div className="ml-8">
                  <textarea 
                    className="w-full min-h-[120px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    placeholder="Ajoutez une description plus détaillée..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={handleSaveDescription} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                    >
                      Sauvegarder
                    </button>
                    <button 
                      onClick={() => {
                        setDescription(currentCard.description || '');
                        setIsEditingDesc(false);
                      }} 
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingDesc(true)}
                  className={`ml-8 p-4 rounded-lg cursor-pointer transition ${
                    description 
                      ? 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700' 
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                >
                  {description ? (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{description}</p>
                  ) : (
                    <p className="text-gray-500">Ajouter une description plus détaillée...</p>
                  )}
                </div>
              )}
            </div>

            {/* CHECKLISTS */}
            {checklists?.length > 0 && (
              <div className="mb-8">
                {checklists.map((cl) => {
                  const items = cl.items || [];
                  const doneCount = items.filter((i) => i.done).length;
                  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
                  return (
                    <div key={cl.id} className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold">
                          <CheckSquare size={18} />
                          <span>{cl.title}</span>
                        </div>
                        <button
                          onClick={() => setDeletingChecklistId(cl.id)}
                          className="text-sm text-gray-500 hover:text-red-600"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs text-gray-500 w-8 text-right">{percent}%</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        {items.map((it) => (
                          <div key={it.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={it.done}
                              onChange={() => handleToggleChecklistItem(cl.id, it.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className={`flex-1 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm ${it.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                              {it.text}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mb-3">
                        <input
                          value={itemDrafts[cl.id] || ''}
                          onChange={(e) => setItemDrafts((d) => ({ ...d, [cl.id]: e.target.value }))}
                          placeholder="Ajouter un élément"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => handleAddChecklistItem(cl.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={() => setItemDrafts((d) => ({ ...d, [cl.id]: '' }))}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                          >
                            Annuler
                          </button>
                          <div className="flex items-center gap-3 ml-auto">
                            <button
                              onClick={() => setShowAssignPopoverId(cl.id)}
                              className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <UserPlus size={14} />
                              Attribuer
                            </button>
                            <button
                              className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => {
                                setCalendarFromDate(dueDate || startDate);
                                if (datesButtonRef.current) {
                                  const rect = datesButtonRef.current.getBoundingClientRect();
                                  const left = Math.min(rect.left, window.innerWidth - 360);
                                  setDatesPopoverPos({ top: rect.bottom + 8, left });
                                }
                                setActivePopover('dates');
                              }}
                            >
                              <Clock size={14} />
                              Date limite
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* ACTIVITÉ PRINCIPALE (non modifiée) */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="text-gray-600 dark:text-gray-400" size={20} />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Activité Principale</h3>
              </div>
              <div className="ml-8 text-gray-500 dark:text-gray-400">
                L'historique des actions (hors commentaires) peut être affiché ici. 
              </div>
            </div>


          </div>

          {/* SIDEBAR DES COMMENTAIRES ET ACTIVITÉ (droite) */}
          <div className={`relative border-l border-gray-200 dark:border-gray-700 w-96 flex-shrink-0 flex flex-col ${showCommentSidebar ? '' : 'hidden'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <MessageSquare size={18} className="text-gray-600 dark:text-gray-300" />
                  <h3 className="text-base font-semibold">Commentaires et activité</h3>
                </div>
                <button
                    onClick={() => setShowCommentSidebarDetails(!showCommentSidebarDetails)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition"
                  >
                    {showCommentSidebarDetails ? 'Masquer les détails' : 'Afficher les détails'}
                </button>
              </div>
              
              {/* ÉDITEUR D'UN COMMENTAIRE EXISTANT (Image 3) */}
              {editingComment && (
                  <div className="mb-4">
                      <CommentEditor 
                          comment={editedCommentText}
                          setComment={setEditedCommentText}
                          handleSaveComment={handleSaveComment}
                          handleCancelEdit={handleCancelEdit}
                          user={user}
                          showDetails={showCommentSidebarDetails}
                          isEditing={true}
                          commentId={editingComment.id}
                          isNewComment={false}
                          handleInsertEmoji={handleInsertEmoji}
                      />
                  </div>
              )}
              
              {/* ÉDITEUR D'UN NOUVEAU COMMENTAIRE (Image 1) */}
              {!editingComment && (
                <div className="relative">
                    <CommentEditor 
                        comment={newCommentText}
                        setComment={setNewCommentText}
                        handleSaveComment={handleSaveComment}
                        handleCancelEdit={handleCancelEdit}
                        user={user}
                        showDetails={showCommentSidebarDetails}
                        isEditing={false}
                        commentId={null}
                        isNewComment={true}
                        handleInsertEmoji={handleInsertEmoji}
                    />
                </div>
              )}
              
            </div>
            
            {/* Liste des commentaires */}
            <div className="flex-1 overflow-y-auto p-4">
              <CommentList 
                activities={currentCard.comments}
                user={user}
                setEditingComment={(comment) => {
                    setEditingComment(comment);
                    setShowEmojiPickerId(null);
                }}
                setDeletingCommentId={setDeletingCommentId}
                toggleEmojiPicker={toggleEmojiPicker}
              />
            </div>
            
            {/* Sélecteur de Réactions (Sticker) pour un commentaire existant */}
            {showEmojiPickerId && showEmojiPickerId !== 'new' && (
                <div 
                    ref={reactionPickerRef} 
                    className="absolute z-50"
                    style={{ top: 'auto', bottom: '20px', left: '10px' }} // Positionnement à ajuster
                >
                    <ReactionPicker onSelectEmoji={handleSelectReaction} onClose={() => toggleEmojiPicker(null)} />
                </div>
            )}
            
            {/* Modal de Confirmation de Suppression (Image 4) */}
            {deletingCommentId && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-80">
                        <div className="p-4 border-b dark:border-gray-700">
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Supprimer le commentaire ?</h4>
                            <button onClick={() => setDeletingCommentId(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                La suppression d'un commentaire est définitive. Opération irréversible.
                            </p>
                            <button 
                                onClick={handleConfirmDelete}
                                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                            >
                                Supprimer le commentaire
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popover assignation (mock premium) */}
            {showAssignPopoverId && (
              <div className="absolute inset-0 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-80 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Attribuer</div>
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowAssignPopoverId(null)}>
                      <X size={16} />
                    </button>
          </div>
                  <div className="text-xs font-semibold text-purple-700 mb-1">PREMIUM</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Ajoutez des dates et attribuez des membres aux checklists avancées.
                  </p>
                  <div className="mb-3">
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                      placeholder="Rechercher des membres"
                      disabled
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <img
                      src="https://i.pravatar.cc/40?img=13"
                      alt="avatar"
                      className="w-6 h-6 rounded-full"
                    />
                    <span>Aurele Franck YANKEU</span>
                  </div>
                  <button
                    onClick={() => setShowAssignPopoverId(null)}
                    className="mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Confirmation suppression checklist */}
            {deletingChecklistId && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-96 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Supprimer Checklist ?</h4>
                    <button className="text-gray-400 hover:text-gray-600" onClick={() => setDeletingChecklistId(null)}>
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    La suppression d'une checklist est définitive et cette opération est irréversible.
                  </p>
                  <button
                    onClick={handleDeleteChecklist}
                    className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                  >
                    Supprimer la checklist
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOUTON POUR AFFICHER LES COMMENTAIRES SI CACHÉS */}
        {!showCommentSidebar && (
          <button 
            onClick={() => setShowCommentSidebar(true)}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition"
          >
            <MessageSquare size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TrelloCardModal;