// backend/src/utils/missionIndemniteCalculator.js
// Calcule les indemnités de mission (repas + prime de sécurité + hébergement)
// d'une personne, selon sa catégorie et les horaires de départ/retour de l'OM.
// Règles (note de service "Frais de mission", confirmées le 2026-09-18) :
// - Petit-déjeuner si l'heure de départ ≤ seuil (07:30 par défaut).
// - Déjeuner si la mission couvre la fenêtre [12h,14h] (départ ≤ 14h ET retour ≥ 12h).
// - Dîner si la mission couvre la fenêtre [18h,20h] (départ ≤ 20h ET retour ≥ 18h).
// - Prime de sécurité (montant fixe, par personne) si l'heure de retour ≥ 20h.
// - Hébergement (par catégorie) si la mission dure plus d'une journée (dateDepart
//   ≠ dateRetour) — versé à chaque personne en mission (missionnaire, conducteur).
// Les cas "2 repas", "2 repas + prime", "petit-déj + 2 repas + prime" décrits par
// l'utilisateur sont simplement la superposition de ces conditions indépendantes,
// pas des cas particuliers à coder séparément.

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * @param {Object} params
 * @param {{montantPetitDejeuner:number, montantDejeuner:number, montantDiner:number, montantHebergement:number}|null} params.rate
 *   Barème de la catégorie de la personne (null si catégorie inconnue/non renseignée).
 * @param {Object} params.thresholds  MissionMealThreshold (heures + montants fixes)
 * @param {string} params.heureDepart  'HH:mm'
 * @param {string} params.heureRetour  'HH:mm'
 * @param {string} params.dateDepart   'YYYY-MM-DD'
 * @param {string} params.dateRetour   'YYYY-MM-DD'
 * @returns {{petitDejeuner:boolean, dejeuner:boolean, diner:boolean, primeSecurite:boolean, hebergement:boolean, total:number, categorieInconnue:boolean}}
 */
export function calculerIndemnite({ rate, thresholds, heureDepart, heureRetour, dateDepart, dateRetour }) {
  const multiJour = !!(dateDepart && dateRetour && dateDepart !== dateRetour);

  if (!rate) {
    return {
      petitDejeuner: false, dejeuner: false, diner: false, primeSecurite: false, hebergement: false,
      montantPetitDejeuner: 0, montantDejeuner: 0, montantDiner: 0, montantPrimeSecurite: 0, montantHebergement: 0,
      total: 0, categorieInconnue: true,
    };
  }

  const depart = toMinutes(heureDepart);
  const retour = toMinutes(heureRetour);
  const limitePetitDej = toMinutes(thresholds?.heureLimitePetitDejeuner) ?? toMinutes('07:30');
  const dejDebut = toMinutes(thresholds?.heureDejeunerDebut) ?? toMinutes('12:00');
  const dejFin = toMinutes(thresholds?.heureDejeunerFin) ?? toMinutes('14:00');
  const dinerDebut = toMinutes(thresholds?.heureDinerDebut) ?? toMinutes('18:00');
  // Fin de la fenêtre dîner ET seuil de la prime de sécurité : les deux
  // coïncident (20h) dans la note de service.
  const limiteSecurite = toMinutes(thresholds?.heureLimiteDiner) ?? toMinutes('20:00');

  const petitDejeuner = depart !== null && depart <= limitePetitDej;
  const dejeuner = depart !== null && retour !== null && depart <= dejFin && retour >= dejDebut;
  const diner = depart !== null && retour !== null && depart <= limiteSecurite && retour >= dinerDebut;
  const primeSecurite = retour !== null && retour >= limiteSecurite;
  const hebergement = multiJour;

  const montantPetitDejeuner = petitDejeuner ? Number(rate.montantPetitDejeuner) : 0;
  const montantDejeuner = dejeuner ? Number(rate.montantDejeuner) : 0;
  const montantDiner = diner ? Number(rate.montantDiner) : 0;
  const montantPrimeSecurite = primeSecurite ? Number(thresholds?.montantPrimeSecurite ?? 5000) : 0;
  const montantHebergement = hebergement ? Number(rate.montantHebergement || 0) : 0;
  const total = montantPetitDejeuner + montantDejeuner + montantDiner + montantPrimeSecurite + montantHebergement;

  return {
    petitDejeuner, dejeuner, diner, primeSecurite, hebergement,
    montantPetitDejeuner, montantDejeuner, montantDiner, montantPrimeSecurite, montantHebergement,
    total, categorieInconnue: false,
  };
}
