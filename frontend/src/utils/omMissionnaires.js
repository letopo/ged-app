// frontend/src/utils/omMissionnaires.js
// Missionnaires d'un Ordre de mission.
//
// Un OM peut concerner plusieurs missionnaires (en plus du conducteur) :
//  - OM récents : metadata.missionnaires = [{ nom, id, source }] ;
//  - OM plus anciens : un seul champ texte, parfois rempli avec plusieurs noms
//    (« NOM A, NOM B », « NOM A et NOM B »…) — on le découpe.
// metadata.nom_missionnaire reste la liste des noms séparés par des virgules
// (titre du document, PDF, anciens écrans).

export const splitNoms = (text) =>
  String(text || '')
    .split(/\s*[,;/&+\n]\s*|\s+et\s+/i)
    .map(n => n.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

export const getMissionnaires = (meta = {}) => {
  if (Array.isArray(meta.missionnaires) && meta.missionnaires.some(m => m?.nom?.trim())) {
    return meta.missionnaires.filter(m => m?.nom?.trim());
  }
  const noms = splitNoms(meta.nom_missionnaire);
  // Un seul nom : l'identifiant choisi dans la liste est fiable
  if (noms.length === 1) return [{ nom: noms[0], id: meta.missionnaire_id || null, source: meta.missionnaire_source || null }];
  return noms.map(nom => ({ nom, id: null, source: null }));
};

// Comparaison de noms sans accents ni casse
export const normNom = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
