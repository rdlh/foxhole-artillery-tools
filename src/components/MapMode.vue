<script setup lang="ts">
import { watch, computed, ref, onMounted, nextTick } from 'vue';
import { useArtilleryStore } from '../stores/artilleryStore';
import { useGroupStore } from '../stores/groupStore';
import { useLanguageStore } from '../stores/languageStore';
import MapPositionModal from './MapPositionModal.vue';

const artilleryStore = useArtilleryStore();
const languageStore = useLanguageStore();
const groupStore = useGroupStore();

// For debugging
console.log('Map selected:', artilleryStore.map);

// Compute the correct image URL
const mapImage = computed(() => {
  if (!artilleryStore.map?.image) return null;
  return `/map/${artilleryStore.map.image}.png`;
});

// Canvas and zoom functionality
const canvasRef = ref<HTMLCanvasElement | null>(null);
const zoomLevel = ref(1); // 1x is default zoom level
const mapImageObj = ref<HTMLImageElement | null>(null);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const lastMouseX = ref(0);
const lastMouseY = ref(0);

// Add tracking for drag distance
const dragStartX = ref(0);
const dragStartY = ref(0);
const hasDragged = ref(false);
const dragThreshold = 3; // pixels

// Add a method to constrain offsets within map boundaries
const constrainOffsets = () => {
  if (!canvasRef.value || !mapImageObj.value) return;
  
  const canvas = canvasRef.value;
  const image = mapImageObj.value;
  
  // Calculate the current scaled dimensions
  const scaledWidth = image.width * zoomLevel.value;
  const scaledHeight = image.height * zoomLevel.value;
  
  // Calculate how far the map can be moved in each direction
  // If the scaled image is smaller than the canvas, no movement is allowed
  const maxOffsetX = Math.max(0, (scaledWidth - canvas.width) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - canvas.height) / 2);
  
  // Constrain the offsets within the boundaries
  offsetX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX.value));
  offsetY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY.value));
};

// Add this constant for the meters-to-pixels conversion
const METERS_PER_PIXEL = 2.14;

// Draw the map on canvas with current zoom level and offset
const drawMap = () => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const fillColor = isDarkMode ? '#e2e8f0' : '#1e293b';

  const canvas = canvasRef.value;
  const image = mapImageObj.value;
  
  if (!canvas || !image) return;
  
  // Constrain offsets before drawing
  constrainOffsets();
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Calculate dimensions based on zoom
  const scaledWidth = image.width * zoomLevel.value;
  const scaledHeight = image.height * zoomLevel.value;
  
  // Apply offset for panning (centered when not panned)
  const x = ((canvas.width - scaledWidth) / 2) + offsetX.value;
  const y = ((canvas.height - scaledHeight) / 2) + offsetY.value;
  
  // Draw the image with zoom and offset
  ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
  
  // Draw artillery ranges if artillery position is set and weapon is selected
  if (artilleryStore.mapArtilleryPosition && artilleryStore.weapon) {
    const artX = artilleryStore.mapArtilleryPosition.x * zoomLevel.value + x;
    const artY = artilleryStore.mapArtilleryPosition.y * zoomLevel.value + y;
    
    // Calculate wind correction factor if we have a result with wind adjustment
    let windCorrectionFactor = 1;
    if (artilleryStore.result && 
        artilleryStore.result.originalDistance && 
        artilleryStore.result.distance &&
        artilleryStore.result.originalDistance !== artilleryStore.result.distance) {
      // Inverse the relationship - if wind increases distance, we need to decrease the range circles
      windCorrectionFactor = artilleryStore.result.originalDistance / artilleryStore.result.distance;
    }
    
    // Draw min range circle (red, "too close" zone)
    // Convert meters to pixels by dividing by METERS_PER_PIXEL
    // Apply wind correction factor to the range
    const minRangePixels = (artilleryStore.weapon.min * windCorrectionFactor) / METERS_PER_PIXEL;
    ctx.beginPath();
    ctx.arc(artX, artY, minRangePixels * zoomLevel.value, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(119, 29, 29, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(119, 29, 29, 1)';
    ctx.lineWidth = 1 * zoomLevel.value;
    ctx.stroke();
    
    // Draw max range circle (green, "effective" zone)
    // Convert meters to pixels by dividing by METERS_PER_PIXEL
    // Apply wind correction factor to the range
    const maxRangePixels = (artilleryStore.weapon.max * windCorrectionFactor) / METERS_PER_PIXEL;
    ctx.beginPath();
    ctx.arc(artX, artY, maxRangePixels * zoomLevel.value, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 115, 55, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 115, 55, 0.1)';
    ctx.lineWidth = 1 * zoomLevel.value;
    ctx.stroke();
    
    // If wind correction is applied, draw the original ranges as dashed circles
    if (windCorrectionFactor !== 1) {
      // Draw original min range with dashed line
      const originalMinRangePixels = artilleryStore.weapon.min / METERS_PER_PIXEL;
      ctx.beginPath();
      ctx.setLineDash([5 * zoomLevel.value, 3 * zoomLevel.value]);
      ctx.arc(artX, artY, originalMinRangePixels * zoomLevel.value, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(119, 29, 29, 1)';
      ctx.lineWidth = 1 * zoomLevel.value;
      ctx.stroke();
      
      // Draw original max range with dashed line
      const originalMaxRangePixels = artilleryStore.weapon.max / METERS_PER_PIXEL;
      ctx.beginPath();
      ctx.arc(artX, artY, originalMaxRangePixels * zoomLevel.value, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(20, 115, 55, 1)';
      ctx.lineWidth = 1 * zoomLevel.value;
      ctx.stroke();
      
      // Reset line dash
      ctx.setLineDash([]);
      
      // Draw wind direction arrow
      if (artilleryStore.windDirection !== null && artilleryStore.windStrength > 0) {
        // Position the wind indicator in the top-right corner of the canvas
        const arrowX = canvas.width - 50;
        const arrowY = 50;
        const arrowLength = 30;
        
        // Draw wind indicator background
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.0)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Label the wind indicator
        ctx.font = `${12}px Arial`;
        ctx.fillStyle = fillColor;
        ctx.textAlign = 'center';
        ctx.fillText(languageStore.t('wind'), arrowX, arrowY - 15);
        
        // Calculate arrow endpoint using wind direction
        // Convert from degrees to radians and adjust for coordinate system
        // In this system, 0 degrees is North (up), and increases clockwise
        const windRadians = (artilleryStore.windDirection - 90) * (Math.PI / 180);
        const endX = arrowX + Math.cos(windRadians) * arrowLength;
        const endY = arrowY + Math.sin(windRadians) * arrowLength;
        
        // Draw arrow shaft
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrow head
        const headLength = 10;
        const angle = Math.atan2(endY - arrowY, endX - arrowX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        // Show wind strength
        ctx.font = `${14}px Arial`;
        ctx.fillStyle = fillColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${artilleryStore.windStrength}`, arrowX, arrowY + 20);
      }
    }
  }
  
  // Draw artillery position if set
  if (artilleryStore.mapArtilleryPosition) {
    const artX = artilleryStore.mapArtilleryPosition.x * zoomLevel.value + x;
    const artY = artilleryStore.mapArtilleryPosition.y * zoomLevel.value + y;
    
    ctx.beginPath();
    ctx.arc(artX, artY, 6 * zoomLevel.value, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 122, 85, 1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(5, 122, 85, 0.0)';
    ctx.lineWidth = 2 * zoomLevel.value;
    ctx.stroke();
  }
  
  // Draw target position if set
  if (artilleryStore.mapTargetPosition) {
    const targetX = artilleryStore.mapTargetPosition.x * zoomLevel.value + x;
    const targetY = artilleryStore.mapTargetPosition.y * zoomLevel.value + y;
    
    ctx.beginPath();
    ctx.arc(targetX, targetY, 6 * zoomLevel.value, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 30, 30, 1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 30, 30, 0.0)';
    ctx.lineWidth = 0 * zoomLevel.value;
    ctx.stroke();
    
    // Draw accuracy circle around target if we have a result with accuracy
    if (artilleryStore.result && artilleryStore.result.accuracy) {
      // Convert meters to pixels by dividing by METERS_PER_PIXEL
      const accuracyPixels = artilleryStore.result.accuracy / METERS_PER_PIXEL;
      
      // Draw the accuracy circle with dashed line
      ctx.beginPath();
      ctx.setLineDash([5 * zoomLevel.value, 3 * zoomLevel.value]);
      ctx.arc(targetX, targetY, accuracyPixels * zoomLevel.value, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 30, 30, 0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 30, 30, 0.8)';
      ctx.lineWidth = 1.5 * zoomLevel.value;
      ctx.stroke();
      
      // Reset line dash
      ctx.setLineDash([]);
    }
  }
};

// Adjust zoom level
const setZoom = (level: number, centerX?: number, centerY?: number) => {
  if (!canvasRef.value || !mapImageObj.value) return;
  
  const oldZoom = zoomLevel.value;
  const newZoom = Math.max(1, Math.min(5, level)); // Clamp between 1 and 5
  
  // If specific center point is provided (e.g., mouse position)
  if (centerX !== undefined && centerY !== undefined) {
    // Calculate how far the point is from the center, adjusted for current offset
    const canvasCenterX = canvasRef.value.width / 2;
    const canvasCenterY = canvasRef.value.height / 2;
    
    // Current position relative to image
    const pointRelX = (centerX - canvasCenterX - offsetX.value) / oldZoom;
    const pointRelY = (centerY - canvasCenterY - offsetY.value) / oldZoom;
    
    // Update zoom
    zoomLevel.value = newZoom;
    
    // Adjust offset to keep the mouse position fixed over the same image point
    offsetX.value = centerX - canvasCenterX - (pointRelX * newZoom);
    offsetY.value = centerY - canvasCenterY - (pointRelY * newZoom);
  } else {
    // Scale offsets proportionally when zooming from UI buttons
    const scaleRatio = newZoom / oldZoom;
    offsetX.value = offsetX.value * scaleRatio;
    offsetY.value = offsetY.value * scaleRatio;
    
    // Update zoom
    zoomLevel.value = newZoom;
  }
  
  // Auto-reset offsets if zoom level is 1
  if (newZoom === 1) {
    offsetX.value = 0;
    offsetY.value = 0;
  }
  
  // Constraints will be applied in drawMap
  drawMap();
};

// Zoom in/out methods
const zoomIn = () => setZoom(zoomLevel.value + 0.5);
const zoomOut = () => setZoom(zoomLevel.value - 0.5);
const resetZoom = () => {
  zoomLevel.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
  drawMap();
};

// Mouse wheel zoom
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  
  // Determine zoom direction
  const delta = -Math.sign(e.deltaY);
  const zoomChange = delta * 0.1; // Smaller increment for smooth zooming
  
  // Get mouse position
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Zoom centered on mouse position
  setZoom(zoomLevel.value + zoomChange, mouseX, mouseY);
};

// Handle mouse events for panning
const startDrag = (e: MouseEvent) => {
  if (zoomLevel.value <= 1) return; // Only enable drag when zoomed in
  
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  
  // Record the starting position
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  dragStartX.value = mouseX;
  dragStartY.value = mouseY;
  lastMouseX.value = mouseX;
  lastMouseY.value = mouseY;
  
  isDragging.value = true;
  hasDragged.value = false; // Reset the drag tracking
};

const doDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  const rect = canvasRef.value?.getBoundingClientRect();
  if (!rect) return;
  
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Calculate total distance moved
  const totalDragX = Math.abs(mouseX - dragStartX.value);
  const totalDragY = Math.abs(mouseY - dragStartY.value);
  
  // Check if we've moved enough to consider this a drag
  if (totalDragX > dragThreshold || totalDragY > dragThreshold) {
    hasDragged.value = true;
  }
  
  // Calculate movement delta
  const dx = mouseX - lastMouseX.value;
  const dy = mouseY - lastMouseY.value;
  
  // Update offsets
  offsetX.value += dx;
  offsetY.value += dy;
  
  // Update last mouse position
  lastMouseX.value = mouseX;
  lastMouseY.value = mouseY;
  
  // Constraints will be applied in drawMap
  drawMap();
};

// Modify endDrag to only set wasRecentlyDragging if actual dragging occurred
const wasRecentlyDragging = ref(false);
const endDrag = () => {
  // Only set wasRecentlyDragging if there was actual movement
  if (isDragging.value && hasDragged.value) {
    wasRecentlyDragging.value = true;
    // Clear the flag after a short delay
    setTimeout(() => {
      wasRecentlyDragging.value = false;
    }, 100);
  }
  
  isDragging.value = false;
};

// Load and initialize map when the image URL changes
watch(mapImage, async (newUrl) => {
  if (!newUrl) {
    mapImageObj.value = null;
    return;
  }
  
  // Reset zoom and offset when changing maps
  zoomLevel.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
  
  // Load the image
  const img = new Image();
  img.src = newUrl;
  img.onload = () => {
    mapImageObj.value = img;
    
    // Initialize canvas size
    if (canvasRef.value) {
      canvasRef.value.width = img.width;
      canvasRef.value.height = img.height;
    }
    
    // Draw the map
    nextTick(() => drawMap());
  };
}, { immediate: true });

// Modal state
const showPositionModal = ref(false);
const modalPosition = ref({ x: 0, y: 0 });
const lastClickedPosition = ref({ x: 0, y: 0 });

// Handle the modal actions
const placeArtillery = () => {
  artilleryStore.mapArtilleryPosition = {
    x: lastClickedPosition.value.x,
    y: lastClickedPosition.value.y
  };
  showPositionModal.value = false;
  drawMap(); // Redraw to show the marker
};

const placeTarget = () => {
  artilleryStore.mapTargetPosition = {
    x: lastClickedPosition.value.x,
    y: lastClickedPosition.value.y
  };
  showPositionModal.value = false;
  drawMap(); // Redraw to show the marker
};

const closeModal = () => {
  showPositionModal.value = false;
};

// Modify the handleClick function to open the modal
const handleClick = (e: MouseEvent) => {
  // Don't process click if we were recently dragging
  if (wasRecentlyDragging.value || hasDragged.value) {
    hasDragged.value = false; // Reset for next time
    return;
  }
  
  const canvas = canvasRef.value;
  const image = mapImageObj.value;
  
  if (!canvas || !image) return;
  
  // Get click position relative to canvas
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // Calculate the top-left position of the image in the canvas
  const imageX = ((canvas.width - image.width * zoomLevel.value) / 2) + offsetX.value;
  const imageY = ((canvas.height - image.height * zoomLevel.value) / 2) + offsetY.value;
  
  // Calculate click position relative to the image, accounting for zoom
  const imageRelativeX = Math.round((clickX - imageX) / zoomLevel.value);
  const imageRelativeY = Math.round((clickY - imageY) / zoomLevel.value);
  
  // Check if click is within image bounds
  if (
    imageRelativeX >= 0 && 
    imageRelativeX < image.width && 
    imageRelativeY >= 0 && 
    imageRelativeY < image.height
  ) {
    // Store the clicked position and show modal
    lastClickedPosition.value = { x: imageRelativeX, y: imageRelativeY };
    modalPosition.value = { x: e.clientX, y: e.clientY };
    showPositionModal.value = true;
    console.log(`Clicked on map at position: x=${imageRelativeX}, y=${imageRelativeY}`);
  }
};

// Watch for changes in the selected weapon
watch(() => artilleryStore.weapon, () => {
  drawMap();
});

// Watch for changes in the artillery or target positions
watch(() => artilleryStore.mapArtilleryPosition, () => {
  drawMap();
});

watch(() => artilleryStore.mapTargetPosition, () => {
  drawMap();
});

// Watch for changes in the selected weapon
watch(() => artilleryStore.windStrength, () => {
  drawMap();
});

// Watch for changes in the selected weapon
watch(() => artilleryStore.windDirection, () => {
  drawMap();
});
</script>

<template>
  <div class="max-w-8xl mx-auto mt-4">
    <!-- Form Section -->
    <div class="md:col-span-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div class="flex gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('selectMap') }}
          </label>
          <select
            v-model="artilleryStore.map"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          >
            <option :value="null">{{ languageStore.t('noMapSelected') }}</option>
            <option v-for="map in artilleryStore.availableMaps" :key="map.name" :value="map">
              {{ map.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('selectWeapon') }}
          </label>
          <select
            v-model="artilleryStore.faction"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          >
            <option :value="null">{{ languageStore.t('filterByFaction') }}</option>
            <option value="colonials">Colonials</option>
            <option value="wardens">Wardens</option>
          </select>
        </div>
        <div class="flex-1">
          <select
            v-model="artilleryStore.weapon"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          >
            <option :value="null">{{ languageStore.t('noWeaponSelected') }}</option>
            <slot v-if="artilleryStore.faction">
              <option v-for="weapon in artilleryStore.filteredWeapons" :key="weapon.name" :value="weapon">
                {{ weapon.name }} ({{ weapon.min }}-{{ weapon.max }}m)
              </option>
            </slot>
            <slot v-else>
              <optgroup v-for="faction in Object.keys(artilleryStore.weaponsGroupedByFaction)" :key="faction" :label="languageStore.t(`${faction}Faction`)">
                <option v-for="weapon in artilleryStore.weaponsGroupedByFaction[faction]" :key="weapon.name" :value="weapon">
                  {{ weapon.name }} ({{ weapon.min }}-{{ weapon.max }}m)
                </option>
              </optgroup>
            </slot>
          </select>
        </div>
      </div>
      <div v-if="artilleryStore.canManageWind" class="flex gap-4 mt-2">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('windStrength') }}
          </label>
          <select
            v-model.number="artilleryStore.windStrength"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          >
            <option :value="0">{{ languageStore.t('unknownWindStrength') }}</option>
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
            <option :value="5">5</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('windDirection') }}
          </label>
          <input
            v-model.number="artilleryStore.windDirection"
            type="number"
            step="1"
            min="0"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
            :placeholder="languageStore.t('degrees')"
          />
        </div>
      </div>
      <div v-else-if="artilleryStore.weapon" class="flex-1 mt-2">
        <p class="text-sm text-gray-800 dark:text-gray-300">
          {{ languageStore.t('weaponNotAvailable') }}
        </p>
      </div>
      <div v-else class="flex-1 mt-2">
        <p class="text-sm text-gray-800 dark:text-gray-300">
          {{ languageStore.t('weaponSelectionRequired') }}
        </p>
      </div>
      <div v-if="artilleryStore.map" class="flex gap-4 mt-4">
        <!-- Canvas Container with Overflow Control -->
        <div class="flex-1 overflow-hidden">
          <canvas 
            ref="canvasRef" 
            v-if="mapImage" 
            class="mx-auto text-black dark:text-white"
            @wheel="handleWheel"
            @mousedown="startDrag"
            @mousemove="doDrag"
            @mouseup="endDrag"
            @mouseleave="endDrag"
            @click="handleClick"
            :style="{ cursor: isDragging ? 'grabbing' : (zoomLevel > 1 ? 'grab' : 'default') }"
          ></canvas>
          <div v-else class="p-4 text-center text-gray-500">
            {{ languageStore.t('mapLoading') || 'Loading map...' }}
          </div>
        </div>
        <div
          v-if="artilleryStore.result"
          class="p-4 border [&.valid]:border-green-500 [&.invalid]:border-red-500 [&.warning]:border-yellow-500 rounded-md [&.valid]:bg-green-200 [&.invalid]:bg-red-200 [&.warning]:bg-yellow-200 [&.valid]:dark:bg-green-900 [&.invalid]:dark:bg-red-900 [&.warning]:dark:bg-yellow-900 [&.valid]:dark:border-green-700 [&.invalid]:dark:border-red-700 [&.warning]:dark:border-yellow-700"
          :class="{
            'valid': artilleryStore.resultValid.isValid,
            'invalid': !artilleryStore.resultValid.isValid && artilleryStore.resultValid.type === 'error',
            'warning': !artilleryStore.resultValid.isValid && artilleryStore.resultValid.type === 'warning'
          }"
        >
          <h3 class="text-lg font-semibold text-black dark:text-white mb-2">
            {{ languageStore.t('artilleryFiringSolution') }}
          </h3>
          <div class="flex flex-col gap-4">
            <div class="flex-1">
              <p class="text-sm text-gray-800 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-4 h-4 mr-1 -mt-1">
                  <path fill="currentColor" d="M22.61,7.05,17,1.39a1,1,0,0,0-.71-.29,1,1,0,0,0-.7.29L1.39,15.54a1,1,0,0,0,0,1.41l5.66,5.66a1,1,0,0,0,.71.29,1,1,0,0,0,.7-.29l2.83-2.83h0l8.49-8.49h0l2.83-2.83A1,1,0,0,0,22.61,7.05ZM19.07,9.17l-.71-.71a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.42l.71.71L16.24,12,14.12,9.88a1,1,0,0,0-1.41,1.41l2.12,2.12L7.76,20.49,3.51,16.24,16.24,3.51l4.25,4.25Z"></path>
                </svg>
                {{ languageStore.t('distanceToTarget') }}
              </p>
              <p class="text-3xl font-bold text-gray-900 text-black dark:text-white leading-tight mt-1">{{ Math.round(artilleryStore.result.distance) }}m</p>
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-800 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-4 h-4 mr-1 -mt-1">
                  <path fill="currentColor" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,17.93V19a1,1,0,0,0-2,0v.93A8,8,0,0,1,4.07,13H5a1,1,0,0,0,0-2H4.07A8,8,0,0,1,11,4.07V5a1,1,0,0,0,2,0V4.07A8,8,0,0,1,19.93,11H19a1,1,0,0,0,0,2h.93A8,8,0,0,1,13,19.93ZM15.14,7.55l-5,2.12a1,1,0,0,0-.52.52l-2.12,5a1,1,0,0,0,.21,1.1,1,1,0,0,0,.7.3.93.93,0,0,0,.4-.09l5-2.12a1,1,0,0,0,.52-.52l2.12-5a1,1,0,0,0-1.31-1.31Zm-2.49,5.1-2.28,1,1-2.28,2.28-1Z"></path>
                </svg>
                {{ languageStore.t('azimuthToTarget') }}
              </p>
              <p class="text-3xl font-bold text-gray-900 text-black dark:text-white leading-tight mt-1">{{ Math.round(artilleryStore.result.azimuth) }}°</p>
            </div>
            <div v-if="artilleryStore.result.accuracy" class="flex-1">
              <p class="text-sm text-gray-800 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-4 h-4 mr-1 -mt-1">
                  <path fill="currentColor" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,17.93V19a1,1,0,0,0-2,0v.93A8,8,0,0,1,4.07,13H5a1,1,0,0,0,0-2H4.07A8,8,0,0,1,11,4.07V5a1,1,0,0,0,2,0V4.07A8,8,0,0,1,19.93,11H19a1,1,0,0,0,0,2h.93A8,8,0,0,1,13,19.93ZM15.14,7.55l-5,2.12a1,1,0,0,0-.52.52l-2.12,5a1,1,0,0,0,.21,1.1,1,1,0,0,0,.7.3.93.93,0,0,0,.4-.09l5-2.12a1,1,0,0,0,.52-.52l2.12-5a1,1,0,0,0-1.31-1.31Zm-2.49,5.1-2.28,1,1-2.28,2.28-1Z"></path>
                </svg>
                {{ languageStore.t('accuracy') }}
              </p>
              <p class="text-3xl font-bold text-gray-900 text-black dark:text-white leading-tight mt-1">{{ Math.round(artilleryStore.result.accuracy) }}m</p>
            </div>
          </div>

          <p v-if="artilleryStore.result.originalDistance != artilleryStore.result.distance" class="text-sm font-normal text-gray-900 text-black dark:text-white leading-tight mt-2">
            <span>{{ languageStore.t('fireDistanceWithoutWind') }} : </span><b>{{ Math.round(artilleryStore.result.originalDistance) }}m</b>
          </p>
        </div>
      </div>
    </div>
    
    <!-- Position Selection Modal -->
    <MapPositionModal
      :show="showPositionModal"
      :x="modalPosition.x"
      :y="modalPosition.y"
      @place-artillery="placeArtillery"
      @place-target="placeTarget"
      @close="closeModal"
    />
  </div>
</template>
