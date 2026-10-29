// frontend/src/campaigns.js
// Calendrier des événements et campagnes affichés sur l'interface (anniversaire
// de l'hôpital, campagnes de santé, journées spéciales…). Ajouter un événement
// = ajouter une entrée ici ; l'affichage est géré par components/Campaign.jsx.
//
//   id          identifiant unique (sert aussi à l'aperçu : ?evt=<id>, ?evt=<id>:teaser, ?evt=0 pour arrêter)
//   tenants     établissements concernés (tenantId) ; omis = tous
//   start, end  'AAAA-MM-JJ' inclus : jours de l'événement (bannière, badge, confettis)
//   teaserFrom  (optionnel) 'AAAA-MM-JJ' : compte à rebours sur le tableau de bord avant start
//   emoji       affiché devant les titres
//   title       titre de la bannière pendant l'événement
//   message     (optionnel) ligne sous le titre
//   teaser      (optionnel) titre du compte à rebours ; {{days}} = jours restants
//   badge       (optionnel) pastille à côté du logo GED pendant l'événement
//   colors      [fond foncé, accent, clair] de la bannière + couleurs des confettis
//   confetti    true = pluie de confettis à la 1re ouverture de chaque journée

export const HSJM_TENANT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

const CAMPAIGNS = [
  {
    id: 'hsjm-30-ans',
    tenants: [HSJM_TENANT_ID],
    teaserFrom: '2026-12-01',
    start: '2026-12-12',
    end: '2026-12-13',
    emoji: '🎉',
    title: 'L’Hôpital Saint-Jean de Malte fête ses 30 ans !',
    message: '1996 – 2026 : trente années au service des patients. Merci à chacune et à chacun d’entre vous.',
    teaser: 'Dans {{days}} jour(s), l’Hôpital Saint-Jean de Malte fête ses 30 ans — rendez-vous les 12 et 13 décembre.',
    badge: '30 ans',
    colors: ['#1B3A6B', '#D4AF37', '#FFF8E1'],
    confetti: true,
  },
];

export default CAMPAIGNS;
