<script setup lang="ts">
import { defineProps } from 'vue';
import { useLanguageStore } from '../stores/languageStore';

const languageStore = useLanguageStore();

interface Calculation {
  id: number;
  spotterToTarget: { distance: number; azimuth: number };
  spotterToArtillery: { distance: number; azimuth: number };
  artilleryToTarget: { distance: number; azimuth: number };
  timestamp: Date;
}

const props = defineProps<{
  history: Calculation[];
  onRecall: (calculation: Calculation) => void;
}>();

// Format date in a readable format
const formatDate = (date: Date): string => {
  const locale = 
    languageStore.currentLanguage === 'fr' ? 'fr-FR' : 
    languageStore.currentLanguage === 'ru' ? 'ru-RU' : 
    'en-US';
  
  console.log('Current language:', languageStore.currentLanguage);
  console.log('Using locale:', locale);
  
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Define a new emit event for clearing history
const emit = defineEmits(['clear']);

// Function to handle clearing the history
const clearHistory = () => {
  emit('clear');
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2">
          <path fill="currentColor" d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.26,6.33l-2,2a1,1,0,0,0-.21,1.09A1,1,0,0,0,3,22h9A10,10,0,0,0,12,2Zm0,18H5.41l.93-.93a1,1,0,0,0,0-1.41A8,8,0,1,1,12,20Z"></path>
        </svg>
        {{ languageStore.t('recentCalculations') }}
      </h3>
      
      <button 
        v-if="history.length > 0"
        @click="clearHistory" 
        class="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900"
        :title="languageStore.t('clearHistory')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5">
          <path fill="currentColor" d="M20,6H16V5a3,3,0,0,0-3-3H11A3,3,0,0,0,8,5V6H4A1,1,0,0,0,4,8H5V19a3,3,0,0,0,3,3h8a3,3,0,0,0,3-3V8h1a1,1,0,0,0,0-2ZM10,5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6H10Zm7,14a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V8H17Z"></path>
        </svg>
      </button>
    </div>
    
    <div v-if="history.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-4">
      {{ languageStore.t('noCalculationHistory') }}
    </div>
    
    <div v-else class="space-y-3">
      <div 
        v-for="calc in history" 
        :key="calc.id" 
        class="p-3 bg-gray-50 dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
        @click="onRecall(calc)"
      >
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-gray-800 dark:text-white">
              {{ languageStore.t('target') }}: {{ calc.artilleryToTarget.distance }}m,  {{ calc.artilleryToTarget.azimuth }}°
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
              {{ languageStore.t('spotter') }}: {{ calc.spotterToTarget.distance }}m, {{ calc.spotterToTarget.azimuth }}°
            </div>
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDate(calc.timestamp) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 