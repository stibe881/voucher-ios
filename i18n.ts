import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import es from './locales/es.json';
import nl from './locales/nl.json';
import ru from './locales/ru.json';
import pl from './locales/pl.json';

export const LANGUAGES = [
    { code: 'de', label: 'Deutsch' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
    { code: 'ru', label: 'Русский' },
];

const resources = {
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    it: { translation: it },
    es: { translation: es },
    nl: { translation: nl },
    ru: { translation: ru },
    pl: { translation: pl },
};

const LANGUAGE_DETECTOR = {
    type: 'languageDetector',
    async: true,
    detect: async (callback: (lang: string) => void) => {
        try {
            // 1. Check AsyncStorage
            const storedLanguage = await AsyncStorage.getItem('user-language');
            if (storedLanguage) {
                return callback(storedLanguage);
            }

            // 2. Check Device Language
            const deviceLocales = Localization.getLocales();
            const deviceLanguage = deviceLocales && deviceLocales[0] ? deviceLocales[0].languageCode : 'de';

            // 3. Fallback
            return callback(deviceLanguage || 'de');

        } catch (error) {
            console.log('Error reading language', error);
            callback('de');
        }
    },
    init: () => { },
    cacheUserLanguage: async (language: string) => {
        try {
            await AsyncStorage.setItem('user-language', language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    },
};

i18n
    .use(initReactI18next)
    .use(LANGUAGE_DETECTOR as any)
    .init({
        resources,
        fallbackLng: 'de',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false
        }
    });

export default i18n;
