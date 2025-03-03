import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { translations } from '../translations'; // You'll need to move translations to a separate file

// Language type definition
import type { Language, Translations } from '../types/language';

// Cast the translations object to this type
const translationsTyped = translations as Translations;

export const useLanguageStore = defineStore('language', () => {
  // Create a reactive language state
  const currentLanguage = ref<Language>('en');

  // Initialize language from localStorage if available
  const initLanguage = (): void => {
    const savedLanguage = localStorage.getItem('artilleryCalculatorLanguage');
    if (savedLanguage === 'fr' || savedLanguage === 'en' || savedLanguage === 'ru' || savedLanguage === 'es') {
      currentLanguage.value = savedLanguage as Language;
    }
  };

  // Save language preference to localStorage
  watch(currentLanguage, (newLanguage) => {
    localStorage.setItem('artilleryCalculatorLanguage', newLanguage);
  });

  // Access to translations
  const t = computed(() => {
    return (key: string): string => {
      return translationsTyped[currentLanguage.value][key] || `#[${key}]`;
    };
  });

  // Change language
  const setLanguage = (lang: Language): void => {
    currentLanguage.value = lang;
  };

  return {
    currentLanguage,
    t,
    setLanguage,
    initLanguage
  };
}); 