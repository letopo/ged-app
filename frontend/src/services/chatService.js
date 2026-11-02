// frontend/src/services/chatService.js

const BASE = '/api/chat';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const get = (url) => fetch(url, { headers: authHeaders() }).then(r => r.json());
const post = (url, body) => fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
const put  = (url, body) => fetch(url, { method: 'PUT',  headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
const del  = (url) => fetch(url, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());

const chatService = {
  getConversations: () => get(`${BASE}/conversations`).then(r => r.data || []),

  getConversation: (id) => get(`${BASE}/conversations/${id}`).then(r => r.data),

  createConversation: (data) => post(`${BASE}/conversations`, data).then(r => ({ ...r, data: r.data })),

  getOrCreateDocumentThread: (documentId) =>
    get(`${BASE}/conversations/document/${documentId}`).then(r => r.data),

  getMessages: (id, before = null) => {
    const url = new URL(`${BASE}/conversations/${id}/messages`, window.location.origin);
    if (before) url.searchParams.set('before', before);
    url.searchParams.set('limit', '60');
    return get(url.toString()).then(r => r.data || []);
  },

  // Réponse : le message, plus `added` (personnes mentionnées ajoutées à la
  // discussion d'un document, et à qui il a été transmis)
  sendMessage: (id, data) =>
    post(`${BASE}/conversations/${id}/messages`, data).then(r => (r.data ? { ...r.data, added: r.added } : r.data)),

  // Bandeau de la discussion d'un document : { accessible, title, status, workflow… }
  getConversationDocument: (id) => get(`${BASE}/conversations/${id}/document`).then(r => r.data || null),

  getMentionCandidates: (id, q = '') =>
    get(`${BASE}/conversations/${id}/mention-candidates?q=${encodeURIComponent(q)}`).then(r => r.data || []),

  // Document de la GED partagé dans la conversation (refusé si on ne peut pas le lire)
  shareDocument: (id, documentId, content = '', mentionUserIds = []) =>
    post(`${BASE}/conversations/${id}/messages`, { documentId, content, mentionUserIds }).then(r => {
      if (!r.success) throw new Error(r.error || r.message || 'Partage impossible');
      return { ...r.data, added: r.added };
    }),

  // Fichier de l'ordinateur ou du téléphone ; onProgress(0..1) pendant l'envoi
  uploadAttachment: (id, file, content = '', onProgress, mentionUserIds = []) => new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('content', content);
    if (mentionUserIds.length) form.append('mentionUserIds', JSON.stringify(mentionUserIds));
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/conversations/${id}/attachments`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* réponse non JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve({ ...body.data, added: body.added });
      else reject(new Error(body.message || body.error || (xhr.status === 413 ? 'Fichier trop volumineux' : 'Envoi impossible')));
    };
    xhr.onerror = () => reject(new Error('Réseau indisponible'));
    xhr.send(form);
  }),

  // Message tel que le voit l'utilisateur (droit d'ouvrir un document partagé)
  getMessage: (id) => get(`${BASE}/messages/${id}`).then(r => r.data),

  // Lien direct (le cookie de session suffit : <img>, ouverture dans un onglet)
  attachmentUrl: (messageId, download = false) =>
    `${BASE}/messages/${messageId}/attachment${download ? '?download=1' : ''}`,

  editMessage: (id, content) =>
    put(`${BASE}/messages/${id}`, { content }).then(r => r.data),

  deleteMessage: (id) => del(`${BASE}/messages/${id}`),

  markAsRead: (id) => post(`${BASE}/conversations/${id}/read`, {}).catch(() => null),

  getUnreadCount: () => get(`${BASE}/unread-count`).then(r => r.count || 0),

  getMembers: (id) => get(`${BASE}/conversations/${id}/members`).then(r => r.data || []),

  addMember: (id, userId) => post(`${BASE}/conversations/${id}/members`, { userId }),

  removeMember: (id, userId) => del(`${BASE}/conversations/${id}/members/${userId}`),

  searchUsers: (q) =>
    get(`/api/users?search=${encodeURIComponent(q)}&limit=20`)
      .then(r => r.data || r.users || []),

  toggleReaction: (conversationId, messageId, emoji) =>
    post(`${BASE}/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji })
      .then(r => r.reactions || []),
};

export default chatService;
