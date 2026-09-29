// backend/src/controllers/releaseNoteController.js
// Nouveautés rédigées par un administrateur. Lecture des notes publiées pour
// tous les utilisateurs de l'établissement ; rédaction réservée aux admins.
// Le « déjà vu » par utilisateur reste géré par /api/auth/release-notes.
import { ReleaseNote, User } from '../models/index.js';

const TARGET_RE = /^(app|\/[a-z0-9\-/]{1,100}|form:[a-z0-9-]{1,60})$/;

// Valide et normalise le corps de requête ; renvoie { data } ou { error }
const sanitize = (body = {}) => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) return { error: 'Titre requis (200 caractères max).' };

  const items = (Array.isArray(body.items) ? body.items : [])
    .filter(it => typeof it === 'string')
    .map(it => it.trim())
    .filter(Boolean);
  if (items.length === 0) return { error: 'Ajoutez au moins une ligne de contenu.' };
  if (items.length > 10 || items.some(it => it.length > 500)) return { error: '10 lignes maximum, 500 caractères par ligne.' };

  const target = typeof body.target === 'string' ? body.target.trim() : 'app';
  if (!TARGET_RE.test(target)) return { error: 'Emplacement d’affichage invalide.' };

  const audience = body.audience === 'admins' ? 'admins' : 'all';
  const status = body.status === 'published' ? 'published' : 'draft';
  return { data: { title, items, target, audience, status } };
};

// Format commun avec les notes livrées dans le code (frontend src/releaseNotes.js)
const toClientNote = (note) => ({
  id: `db-${note.id}`,              // préfixe : pas de collision avec les notes du code
  dbId: note.id,
  date: (note.publishedAt || note.createdAt).toISOString().slice(0, 10),
  target: note.target,
  title: note.title,
  items: note.items || [],
  audience: note.audience,
  status: note.status,
  author: note.author ? `${note.author.firstName || ''} ${note.author.lastName || ''}`.trim() : null,
  updatedAt: note.updatedAt,
});

const withAuthor = { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] };

// GET /api/release-notes — notes publiées (tous les utilisateurs)
export const listPublished = async (req, res) => {
  try {
    const notes = await ReleaseNote.findAll({ where: { status: 'published' }, include: [withAuthor], order: [['publishedAt', 'ASC']] });
    res.json({ success: true, notes: notes.map(toClientNote) });
  } catch (error) {
    console.error('Erreur lecture nouveautés:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// GET /api/release-notes/admin — toutes les notes, brouillons compris (admins)
export const listAll = async (req, res) => {
  try {
    const notes = await ReleaseNote.findAll({ include: [withAuthor], order: [['createdAt', 'DESC']] });
    res.json({ success: true, notes: notes.map(toClientNote) });
  } catch (error) {
    console.error('Erreur lecture nouveautés (admin):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// POST /api/release-notes (admins)
export const createNote = async (req, res) => {
  try {
    const { data, error } = sanitize(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const note = await ReleaseNote.create({
      ...data,
      publishedAt: data.status === 'published' ? new Date() : null,
      createdBy: req.user.id,
    });
    await note.reload({ include: [withAuthor] });
    res.status(201).json({ success: true, note: toClientNote(note) });
  } catch (error) {
    console.error('Erreur création nouveauté:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// PUT /api/release-notes/:id (admins)
// Modifier une note déjà publiée ne la ré-affiche pas à ceux qui l'ont vue ;
// pour une nouvelle annonce, rédiger une nouvelle note.
export const updateNote = async (req, res) => {
  try {
    const note = await ReleaseNote.findByPk(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Nouveauté introuvable.' });
    const { data, error } = sanitize(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    await note.update({
      ...data,
      publishedAt: data.status === 'published' ? (note.publishedAt || new Date()) : null,
    });
    await note.reload({ include: [withAuthor] });
    res.json({ success: true, note: toClientNote(note) });
  } catch (error) {
    console.error('Erreur modification nouveauté:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};

// DELETE /api/release-notes/:id (admins)
export const deleteNote = async (req, res) => {
  try {
    const note = await ReleaseNote.findByPk(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Nouveauté introuvable.' });
    await note.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression nouveauté:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
};
