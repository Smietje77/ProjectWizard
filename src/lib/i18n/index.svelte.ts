import nl from './nl';
import en from './en';

export type Locale = 'nl' | 'en';
// Gebruik een generiek string-type voor de vertalingen zodat NL en EN compatible zijn
type DeepStringify<T> = T extends string
	? string
	: T extends object
		? { [K in keyof T]: DeepStringify<T[K]> }
		: T;

export type Translations = DeepStringify<typeof nl>;

const translations: Record<Locale, Translations> = { nl, en };

const LOCALE_STORAGE_KEY = 'projectwizard:locale';

function loadSavedLocale(): Locale {
	if (typeof localStorage === 'undefined') return 'nl';
	const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
	return saved === 'en' || saved === 'nl' ? saved : 'nl';
}

class I18n {
	locale = $state<Locale>(loadSavedLocale());

	get t(): Translations {
		return translations[this.locale];
	}

	setLocale(locale: Locale) {
		this.locale = locale;
		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale;
		}
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(LOCALE_STORAGE_KEY, locale);
		}
	}
}

export const i18n = new I18n();
