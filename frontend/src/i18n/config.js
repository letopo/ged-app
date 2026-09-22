// frontend/src/i18n/config.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

const getInitialLang = () => {
  try {
    return localStorage.getItem('lang') || 'fr';
  } catch {
    return 'fr';
  }
};

// Le français n'a pas de fichier de ressources : sans traduction pour la
// langue active, i18next retourne la clé elle-même — qui EST le texte
// français d'origine (voir méthode d'extraction : t('<texte FR>')).
i18n.use(initReactI18next).init({
  lng: getInitialLang(),
  fallbackLng: 'fr',
  resources: {
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
  },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
