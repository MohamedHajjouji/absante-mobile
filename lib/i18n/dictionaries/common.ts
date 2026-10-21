import type { Lang } from '../language-context';
import type { Dict } from '../language-context';

/** Shared patient strings (tabs, buttons). Keys `common.*`. */
export const common: Record<Lang, Dict> = {
  fr: {
    'common.tabs.home': 'Accueil',
    'common.tabs.search': 'Recherche',
    'common.tabs.rdv': 'Rendez-vous',
    'common.tabs.profile': 'Profil',
    'common.login': 'Se connecter',
    'common.search': 'Rechercher',
    'common.viewProfile': 'Voir profil',
    'common.years': '{n} ans',
  },
  en: {
    'common.tabs.home': 'Home',
    'common.tabs.search': 'Search',
    'common.tabs.rdv': 'Bookings',
    'common.tabs.profile': 'Profile',
    'common.login': 'Log in',
    'common.search': 'Search',
    'common.viewProfile': 'View profile',
    'common.years': '{n} yrs',
  },
  ar: {
    'common.tabs.home': 'الرئيسية',
    'common.tabs.search': 'البحث',
    'common.tabs.rdv': 'المواعيد',
    'common.tabs.profile': 'الملف',
    'common.login': 'تسجيل الدخول',
    'common.search': 'بحث',
    'common.viewProfile': 'عرض الملف',
    'common.years': '{n} سنة',
  },
};
