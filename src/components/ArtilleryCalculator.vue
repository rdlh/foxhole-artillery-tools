<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import TriangleVisualization from './TriangleVisualization.vue';
import CalculationHistory from './CalculationHistory.vue';
import LanguageSelector from './LanguageSelector.vue';
import ThemeToggle from './ThemeToggle.vue';
import ArtilleryGroup from './ArtilleryGroup.vue';
import SpotterMode from './SpotterMode.vue';
import MapMode from './MapMode.vue';

// Import stores instead of composables
import { useArtilleryStore } from '../stores/artilleryStore';
import { useGroupStore } from '../stores/groupStore';
import { useLanguageStore } from '../stores/languageStore';

// Use stores instead of local state
const artilleryStore = useArtilleryStore();
const languageStore = useLanguageStore();
const groupStore = useGroupStore();

// Load calculation history on component mount
onMounted(() => {
  artilleryStore.loadHistoryFromLocalStorage();
  artilleryStore.loadSavedSettings();
});

// Handle calculation received from other group members
const handleReceivedCalculation = (calculation: any) => {
  // Use artillery store to handle the calculation
  artilleryStore.handleReceivedCalculation(calculation);
  
  // Force calculation of result
  artilleryStore.calculateSolution();
  
  // Set calculation source to 'group'
  artilleryStore.calculationSource = 'group';
  
  // Add visual notification that data was updated from group
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
  notification.textContent = languageStore.t('calculationReceived');
  document.body.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
};

// Watch for changes in input fields to send updates to group
// Debounce function to wait for user to finish typing
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  }
}

// Create debounced version of sendInputUpdate
const debouncedSendUpdate = debounce(() => {
  if (groupStore.isConnected) {
    groupStore.sendInputUpdate();
  }
}, 500); // Wait 500ms after last change before sending

watch(
  [
    () => artilleryStore.spotterToTargetDistance,
    () => artilleryStore.spotterToTargetAzimuth,
    () => artilleryStore.spotterToArtilleryDistance,
    () => artilleryStore.spotterToArtilleryAzimuth
  ],
  debouncedSendUpdate,
  { deep: true }
);

// Add this type definition
type TriangleVisRef = {
  zoomIn: () => void;
  zoomOut: () => void;
};

// Create a properly typed ref
const triangleVis = ref<TriangleVisRef | null>(null);
</script>

<template>
  <div class="max-w-8xl mx-auto">
    <!-- Language selector in top right -->
    <div class="flex items-center justify-end space-x-2 mb-4">
      <ThemeToggle />
      <LanguageSelector />
    </div>

    <!-- Add the Artillery Group component at the top -->
    <ArtilleryGroup 
      ref="artilleryGroup"
      :onCalculationReceived="handleReceivedCalculation"
      :spotterToTargetDistance="artilleryStore.spotterToTargetDistance"
      :spotterToTargetAzimuth="artilleryStore.spotterToTargetAzimuth"
      :spotterToArtilleryDistance="artilleryStore.spotterToArtilleryDistance"
      :spotterToArtilleryAzimuth="artilleryStore.spotterToArtilleryAzimuth"
    />

    <div class="max-w-8xl flex border-b border-gray-200 dark:border-gray-700">
      <button class="px-4 py-2 font-semibold" 
              :class="artilleryStore.mode === 'spotter' ? 'text-gray-900 dark:text-gray-100 border-b-2 border-blue-500 dark:border-blue-400 -mb-px' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
              @click="artilleryStore.mode = 'spotter'">
        {{ languageStore.t('spotterMode') }}
      </button>
      <button class="px-4 py-2 font-semibold" 
              :class="artilleryStore.mode === 'map' ? 'text-gray-900 dark:text-gray-100 border-b-2 border-blue-500 dark:border-blue-400 -mb-px' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
              @click="artilleryStore.mode = 'map'">
        {{ languageStore.t('mapMode') }}
      </button>
    </div>

    <!-- Spotter Mode or Map Mode -->
    <div v-if="artilleryStore.mode === 'spotter'">
      <SpotterMode>
        <template #triangle-visualization>
          <TriangleVisualization ref="triangleVis" />
        </template>
        <template #calculation-history>
          <CalculationHistory
            :history="artilleryStore.calculationHistory"
            :onRecall="artilleryStore.recallCalculation"
            @clear="artilleryStore.clearCalculationHistory"
          />
        </template>
      </SpotterMode>
    </div>
    <div v-else>
      <!-- Map Mode will be added later -->
      <MapMode />
    </div>
  </div>
</template> 