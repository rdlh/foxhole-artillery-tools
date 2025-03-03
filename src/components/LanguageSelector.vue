<script setup lang="ts">
import { useLanguageStore } from '../stores/languageStore';

const languageStore = useLanguageStore();

// Handle language change
const handleLanguageChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  languageStore.setLanguage(select.value as 'en' | 'fr' | 'ru');
};
</script>

<template>
  <div class="language-selector">
    <div class="relative">
      <select 
        :value="languageStore.currentLanguage"
        @change="handleLanguageChange"
        class="appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 rounded-md pl-10 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="ru">Русский</option>
        <option value="es">Español</option>
      </select>
      
      <!-- Language icon -->
      <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-700 dark:text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-4 h-4">
          <path fill="currentColor" d="M14.022,7h1a1.0013,1.0013,0,0,1,1,1V9a1,1,0,0,0,2,0V8a3.00328,3.00328,0,0,0-3-3h-1a1,1,0,0,0,0,2Zm-4,9h-1a1.0013,1.0013,0,0,1-1-1V14a1,1,0,0,0-2,0v1a3.00328,3.00328,0,0,0,3,3h1a1,1,0,0,0,0-2Zm11-1a1,1,0,0,0,0-2h-3v-.5a1,1,0,0,0-2,0V13h-3a1,1,0,0,0,0,2h5.18427a6.72756,6.72756,0,0,1-1.22553,2.52667,6.66828,6.66828,0,0,1-.62915-.98272.99972.99972,0,1,0-1.77929.9121,8.67791,8.67791,0,0,0,.9591,1.468A6.6182,6.6182,0,0,1,13.10645,20.023a1.00008,1.00008,0,0,0,.42675,1.9541,8.63506,8.63506,0,0,0,3.445-1.62164,8.72368,8.72368,0,0,0,3.46857,1.62115,1,1,0,1,0,.43066-1.95312,6.72477,6.72477,0,0,1-2.4461-1.09009A8.73637,8.73637,0,0,0,20.24371,15ZM9.05176,11.24268a1.00011,1.00011,0,0,0,1.94043-.48536L9.23486,3.72754a2.28107,2.28107,0,0,0-4.42578,0L3.05176,10.75732a1.00011,1.00011,0,0,0,1.94043.48536L5.5528,9H8.49115ZM6.0528,7l.69671-2.78711a.2913.2913,0,0,1,.54492,0L7.99115,7Z"></path>
        </svg>
      </div>
      
      <!-- Custom dropdown arrow -->
      <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-700 dark:text-gray-300">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
  </div>
</template> 