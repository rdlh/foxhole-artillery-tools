export type Language = 'en' | 'fr' | 'ru' | 'es'	;

// Define a type for translations
export type TranslationDictionary = Record<string, string>;
export type Translations = Record<Language, TranslationDictionary>;