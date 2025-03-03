<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useLanguageStore } from '@/stores/languageStore';

const languageStore = useLanguageStore();

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  (e: 'place-artillery'): void;
  (e: 'place-target'): void;
  (e: 'close'): void;
}>();

// Handle clicks outside the modal
const modalRef = ref<HTMLDivElement | null>(null);
const modalWidth = ref(0);
const modalHeight = ref(0);

// Track whether the modal is above or below the click point
const isAboveClick = ref(false);

// Calculate position that centers the modal horizontally on click and keeps it within viewport
const modalPosition = computed(() => {
  if (!modalWidth.value || !modalHeight.value) {
    return { left: '0px', top: '0px' };
  }

  // Calculate the position that would center the modal horizontally on the click
  let left = props.x - (modalWidth.value / 2);
  // Position just below the click point, not centered vertically
  let top = props.y + 10;
  
  // Reset the position flag
  isAboveClick.value = false;
  
  // Prevent going off-screen
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Adjust if too far left
  if (left < 10) {
    left = 10;
  }
  
  // Adjust if too far right
  if (left + modalWidth.value > windowWidth - 10) {
    left = windowWidth - modalWidth.value - 10;
  }
  
  // Adjust if too far down - in this case, position above the click instead
  if (top + modalHeight.value > windowHeight - 10) {
    top = props.y - modalHeight.value - 10;
    isAboveClick.value = true;
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`
  };
});

// Calculate the position of the arrow relative to the modal
const arrowPosition = computed(() => {
  if (!modalWidth.value) return { left: '50%' };

  // Calculate where the click point is relative to the modal's left edge
  const modalLeft = parseInt(modalPosition.value.left);
  
  // Calculate the arrow position, centering the arrow tip exactly at the click point
  // The -8 accounts for half the arrow width (16px total width from the borders)
  const arrowLeft = Math.max(10, Math.min(modalWidth.value - 10, props.x - modalLeft - 8));
  
  return { left: `${arrowLeft}px` };
});

// Measure modal dimensions when it becomes visible
const updateModalDimensions = () => {
  if (modalRef.value) {
    modalWidth.value = modalRef.value.offsetWidth;
    modalHeight.value = modalRef.value.offsetHeight;
  }
};

const handleOutsideClick = (e: MouseEvent) => {
  if (modalRef.value && !modalRef.value.contains(e.target as Node)) {
    emit('close');
  }
};

// Update dimensions when modal appears or window resizes
onMounted(() => {
  if (props.show) {
    setTimeout(updateModalDimensions, 0);
  }
  
  window.addEventListener('resize', updateModalDimensions);
});

// Watch for show changes to update dimensions
watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(updateModalDimensions, 0);
  }
});
</script>

<template>
  <teleport to="body">
    <div 
      v-if="show" 
      class="fixed inset-0 flex items-center justify-center z-50"
      @click="handleOutsideClick"
    >
      <div 
        ref="modalRef"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm w-full relative"
        :style="{ position: 'absolute', left: modalPosition.left, top: modalPosition.top }"
        :class="{ 'arrow-top': !isAboveClick, 'arrow-bottom': isAboveClick }"
      >
        <!-- Arrow element for top position -->
        <div 
          v-if="!isAboveClick"
          class="absolute w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white dark:border-b-gray-800"
          style="top: -8px; transform: translateX(0);"
          :style="arrowPosition"
        ></div>
        
        <!-- Arrow element for bottom position -->
        <div 
          v-if="isAboveClick"
          class="absolute w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800"
          style="bottom: -8px; transform: translateX(0);"
          :style="arrowPosition"
        ></div>
        <div class="flex gap-3">
          <button 
            @click="emit('place-artillery')"
            class="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {{ languageStore.t('artilleryWord') }}
          </button>
          <button 
            @click="emit('place-target')"
            class="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {{ languageStore.t('targetWord') }}
          </button>
        </div>
        <button 
          @click="emit('close')"
          class="mt-3 w-full px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {{ languageStore.t('cancel') }}
        </button>
      </div>
    </div>
  </teleport>
</template> 