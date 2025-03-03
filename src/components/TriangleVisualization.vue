<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useLanguageStore } from '../stores/languageStore';
import { useArtilleryStore } from '../stores/artilleryStore';

const languageStore = useLanguageStore();
const artilleryStore = useArtilleryStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);

// Computed property to check if visualization can be drawn
const canDrawVisualization = computed(() => {
  return typeof artilleryStore.spotterToTargetDistance === 'number' && 
         typeof artilleryStore.spotterToTargetAzimuth === 'number' && 
         typeof artilleryStore.spotterToArtilleryDistance === 'number' && 
         typeof artilleryStore.spotterToArtilleryAzimuth === 'number';
});

// Draw the triangle visualization
const drawVisualization = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Only draw if we have all the data
  if (!canDrawVisualization.value) {
    return;
  }
  
  // Calculate initial positions in world coordinates (before scaling)
  // First calculate the raw positions
  const spotterX = 0; // Spotter at origin
  const spotterY = 0;
  
  // Calculate target position
  const targetAngle = (artilleryStore.spotterToTargetAzimuth! - 90) * Math.PI / 180;
  let targetX = spotterX + artilleryStore.spotterToTargetDistance! * Math.cos(targetAngle);
  let targetY = spotterY + artilleryStore.spotterToTargetDistance! * Math.sin(targetAngle);
  
  // Calculate artillery position
  const artilleryAngle = (artilleryStore.spotterToArtilleryAzimuth! - 90) * Math.PI / 180;
  const artilleryX = spotterX + artilleryStore.spotterToArtilleryDistance! * Math.cos(artilleryAngle);
  const artilleryY = spotterY + artilleryStore.spotterToArtilleryDistance! * Math.sin(artilleryAngle);

  // Calculate corrections from spotter's perspective
  // For left/right: perpendicular to spotter-target direction
  // For up/down: along the spotter-target direction
  const perpAngle = targetAngle - Math.PI/2; // 90 degrees counterclockwise
  
  // Calculate net corrections
  const netLeftRightCorrection = artilleryStore.correctionFromSpotterLeft - artilleryStore.correctionFromSpotterRight;
  const netUpDownCorrection = artilleryStore.correctionFromSpotterUp - artilleryStore.correctionFromSpotterDown;
  
  // Apply left/right corrections (perpendicular to spotter-target vector)
  const leftRightCorrectionX = netLeftRightCorrection * Math.cos(perpAngle);
  const leftRightCorrectionY = netLeftRightCorrection * Math.sin(perpAngle);
  
  // Apply up/down corrections (along spotter-target vector)
  const upDownCorrectionX = netUpDownCorrection * Math.cos(targetAngle);
  const upDownCorrectionY = netUpDownCorrection * Math.sin(targetAngle);
  
  // Apply corrections
  targetX = targetX + leftRightCorrectionX + upDownCorrectionX;
  targetY = targetY + leftRightCorrectionY + upDownCorrectionY;
  
  // Calculate direct fire position (without wind effect)
  let aimPointX = targetX;
  let aimPointY = targetY;
  
  // If we have wind and the result shows different distances due to wind
  const hasWindEffect = artilleryStore.windStrength > 0 && 
                        artilleryStore.result && 
                        artilleryStore.result.originalDistance !== artilleryStore.result.distance;
  
  // Calculate aim point position if wind is affecting the shot
  if (hasWindEffect && artilleryStore.result && artilleryStore.windStrength > 0 && artilleryStore.weapon?.windModifier) {
    // We need to calculate where we should aim to hit the target with wind
    // This means offsetting in the opposite direction of the wind
    const windAngleRad = (artilleryStore.windDirection) * Math.PI / 180;
    const windOffsetX = (artilleryStore.windStrength * artilleryStore.weapon.windModifier) * Math.sin(windAngleRad);
    const windOffsetY = (artilleryStore.windStrength * artilleryStore.weapon.windModifier) * Math.cos(windAngleRad);
    
    // The aim point is the target position plus the wind offset (opposite direction of wind effect)
    aimPointX = targetX + windOffsetX;
    aimPointY = targetY + windOffsetY;
  }
  
  // Find the bounding box for all points
  const pointsToInclude = [spotterX, spotterY, targetX, targetY, artilleryX, artilleryY];
  
  // Add aim point coordinates to bounding box if using wind
  if (hasWindEffect) {
    pointsToInclude.push(aimPointX, aimPointY);
  }
  
  const minX = Math.min(...pointsToInclude.filter((_, i) => i % 2 === 0));
  const maxX = Math.max(...pointsToInclude.filter((_, i) => i % 2 === 0));
  const minY = Math.min(...pointsToInclude.filter((_, i) => i % 2 === 1));
  const maxY = Math.max(...pointsToInclude.filter((_, i) => i % 2 === 1));
  
  // Calculate the width and height of the bounding box
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  
  // Calculate the center of the bounding box
  const boxCenterX = (minX + maxX) / 2;
  const boxCenterY = (minY + maxY) / 2;
  
  // Calculate the canvas usable area (with padding)
  const padding = 40; // Increased padding
  const canvasUsableWidth = canvas.width - (padding * 2);
  const canvasUsableHeight = canvas.height - (padding * 2);
  
  // Calculate scale to fit the bounding box in the canvas
  // We want to ensure the entire triangle fits with enough room for labels
  const scaleX = boxWidth > 0 ? canvasUsableWidth / boxWidth : 1;
  const scaleY = boxHeight > 0 ? canvasUsableHeight / boxHeight : 1;
  const scale = Math.min(scaleX, scaleY) * 0.5 * artilleryStore.visualizationZoom; // Apply zoom level
  
  // Calculate final canvas coordinates
  const canvasCenterX = canvas.width / 2;
  const canvasCenterY = canvas.height / 2;
  
  // Transform from world to canvas coordinates
  const transformX = (x: number) => canvasCenterX + (x - boxCenterX) * scale;
  const transformY = (y: number) => canvasCenterY + (y - boxCenterY) * scale;
  
  // Get final coordinates
  const finalSpotterX = transformX(spotterX);
  const finalSpotterY = transformY(spotterY);
  const finalTargetX = transformX(targetX);
  const finalTargetY = transformY(targetY);
  const finalArtilleryX = transformX(artilleryX);
  const finalArtilleryY = transformY(artilleryY);
  const finalAimPointX = transformX(aimPointX);
  const finalAimPointY = transformY(aimPointY);
  const fontSize = 12;
  
  // Draw the triangle
  ctx.beginPath();
  ctx.moveTo(finalSpotterX, finalSpotterY);
  ctx.lineTo(finalTargetX, finalTargetY);
  ctx.lineTo(finalArtilleryX, finalArtilleryY);
  ctx.closePath();
  
  // Style for the triangle
  ctx.strokeStyle = '#64748b';
  ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fill();
  
  // Draw connecting lines
  // Spotter to target line
  ctx.beginPath();
  ctx.moveTo(finalSpotterX, finalSpotterY);
  ctx.lineTo(finalTargetX, finalTargetY);
  ctx.strokeStyle = '#3b82f6'; // Blue for spotter
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Spotter to artillery line
  ctx.beginPath();
  ctx.moveTo(finalSpotterX, finalSpotterY);
  ctx.lineTo(finalArtilleryX, finalArtilleryY);
  ctx.strokeStyle = '#3b82f6'; // Blue for spotter
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Draw firing solution based on wind effect
  if (artilleryStore.result) {
    if (hasWindEffect) {
      // Draw aim point line (where we're actually aiming)
      ctx.beginPath();
      ctx.moveTo(finalArtilleryX, finalArtilleryY);
      ctx.lineTo(finalAimPointX, finalAimPointY);
      ctx.strokeStyle = '#22c55e'; // Green for artillery aim
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Draw wind effect line (from aim point to actual target)
      ctx.beginPath();
      ctx.moveTo(finalAimPointX, finalAimPointY);
      ctx.lineTo(finalTargetX, finalTargetY);
      ctx.strokeStyle = '#f59e0b'; // Amber/orange for wind
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // Draw a small circle at the aim point
      ctx.beginPath();
      ctx.arc(finalAimPointX, finalAimPointY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    } else {
      // Just draw the direct line if no wind effect
      ctx.beginPath();
      ctx.moveTo(finalArtilleryX, finalArtilleryY);
      ctx.lineTo(finalTargetX, finalTargetY);
      ctx.strokeStyle = '#22c55e'; // Green for artillery
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  
  // Draw points
  // Spotter point (blue)
  ctx.beginPath();
  ctx.arc(finalSpotterX, finalSpotterY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();
  
  // Target point (red)
  ctx.beginPath();
  ctx.arc(finalTargetX, finalTargetY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  
  // Artillery point (green)
  ctx.beginPath();
  ctx.arc(finalArtilleryX, finalArtilleryY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.fill();
  
  // Set text fill style based on dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDarkMode ? '#e2e8f0' : '#1e293b';
  
  // Set font for labels
  ctx.font = `${fontSize}px sans-serif`;
  
  // Position labels intelligently to avoid overlap
  // Calculate position for each label to ensure it doesn't run off the canvas
  const finalSpotterTextX = finalSpotterX > canvas.width / 2 ? finalSpotterX + 8 : finalSpotterX - ctx.measureText(languageStore.t('spotter')).width - 8;
  const finalSpotterTextY = finalSpotterY > canvas.height / 2 ? finalSpotterY + (fontSize + 8) : finalSpotterY - 8;

  ctx.fillStyle = '#3b82f6';
  ctx.fillText(languageStore.t('spotter'), finalSpotterTextX, finalSpotterTextY);

  const finalTargetTextX = finalTargetX > canvas.width / 2 ? finalTargetX + 8 : finalTargetX - ctx.measureText(languageStore.t('target')).width - 8;
  const finalTargetTextY = finalTargetY > canvas.height / 2 ? finalTargetY + (fontSize + 8) : finalTargetY - 8;

  ctx.fillStyle = '#ef4444';
  ctx.fillText(languageStore.t('target'), finalTargetTextX, finalTargetTextY);

  const finalArtilleryTextX = finalArtilleryX > canvas.width / 2 ? finalArtilleryX + 8 : finalArtilleryX - ctx.measureText(languageStore.t('artillery')).width - 8;
  const finalArtilleryTextY = finalArtilleryY > canvas.height / 2 ? finalArtilleryY + (fontSize + 8) : finalArtilleryY - 8;

  ctx.fillStyle = '#22c55e';
  ctx.fillText(languageStore.t('artillery'), finalArtilleryTextX, finalArtilleryTextY);
  
  // Add wind effect label if applicable
  if (hasWindEffect) {
    const finalWindTextX = finalAimPointX > canvas.width / 2 ? finalAimPointX + 8 : finalAimPointX - ctx.measureText(languageStore.t('windCorrection')).width - 8;
    const finalWindTextY = finalAimPointY > canvas.height / 2 ? finalAimPointY + (fontSize + 8) : finalAimPointY - 8;
    
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(languageStore.t('windCorrection'), finalWindTextX, finalWindTextY);
  }
};

// Update the visualization when store values change
watch(
  () => [
    artilleryStore.spotterToTargetDistance,
    artilleryStore.spotterToTargetAzimuth,
    artilleryStore.spotterToArtilleryDistance,
    artilleryStore.spotterToArtilleryAzimuth,
    artilleryStore.visualizationZoom,
    artilleryStore.result
  ],
  drawVisualization,
  { immediate: true }
);

onMounted(() => {
  drawVisualization();
  
  // Add window resize handler to redraw when the window size changes
  window.addEventListener('resize', drawVisualization);
});

onUnmounted(() => {
  window.removeEventListener('resize', drawVisualization);
});
</script>

<template>
  <div class="triangle-visualization relative">
    <!-- Main canvas -->
    <canvas 
      v-if="canDrawVisualization"
      ref="canvasRef"
      width="420"
      height="420"
      class="w-full bg-white dark:bg-gray-800"
    ></canvas>
    
    <!-- Message when fields are not filled -->
    <div v-if="!canDrawVisualization" class="absolute inset-0 flex items-center justify-center">
      <p class="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
        {{ languageStore.t('fillInAllFieldsToSeeVisualization') }}
      </p>
    </div>
    
    <!-- Cardinal directions overlay -->
    <div v-if="canDrawVisualization" class="absolute inset-0 pointer-events-none">
      <svg viewBox="-120 -110 240 240" class="w-full h-full">
        <!-- Cardinal direction markers -->
        <text x="0" y="-105" text-anchor="middle" class="text-xs font-semibold fill-gray-600 dark:fill-gray-300">{{ languageStore.t('north') }}</text>
        <text x="115" y="1" dominant-baseline="middle" text-anchor="end" class="text-xs font-semibold fill-gray-600 dark:fill-gray-300">{{ languageStore.t('east') }}</text>
        <text x="0" y="115" text-anchor="middle" class="text-xs font-semibold fill-gray-600 dark:fill-gray-300">{{ languageStore.t('south') }}</text>
        <text x="-115" y="1" dominant-baseline="middle" text-anchor="start" class="text-xs font-semibold fill-gray-600 dark:fill-gray-300">{{ languageStore.t('west') }}</text>
        
        <!-- 45 degree direction markers (smaller) -->
        <text x="75" y="-75" text-anchor="middle" class="text-[8px] fill-gray-500 dark:fill-gray-500">45°</text>
        <text x="80" y="80" text-anchor="middle" class="text-[8px] fill-gray-500 dark:fill-gray-500">135°</text>
        <text x="-80" y="80" text-anchor="middle" class="text-[8px] fill-gray-500 dark:fill-gray-500">225°</text>
        <text x="-75" y="-75" text-anchor="middle" class="text-[8px] fill-gray-500 dark:fill-gray-500">315°</text>
        
        <!-- Tick marks at cardinal points -->
        <line x1="0" y1="-100" x2="0" y2="-95" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="100" y1="0" x2="95" y2="0" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="0" y1="100" x2="0" y2="95" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="-100" y1="0" x2="-95" y2="0" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />

        <!-- Tick marks at 45 degree increments -->
        <line x1="70.7" y1="-70.7" x2="67.2" y2="-67.2" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="70.7" y1="70.7" x2="67.2" y2="67.2" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="-70.7" y1="70.7" x2="-67.2" y2="67.2" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        <line x1="-70.7" y1="-70.7" x2="-67.2" y2="-67.2" class="stroke-gray-400 dark:stroke-gray-500" stroke-width="1" />
        
        <!-- Reference circle -->
        <circle cx="0" cy="0" r="100" fill="none" class="stroke-gray-200 dark:stroke-gray-700" stroke-width="1" />
      </svg>
    </div>
    
    <!-- Legend -->
    <div class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
      <div class="flex items-center justify-center space-x-4">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
          <span>{{ languageStore.t('spotter') }}</span>
        </div>
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span>{{ languageStore.t('target') }}</span>
        </div>
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span>{{ languageStore.t('artillery') }}</span>
        </div>
        <div v-if="artilleryStore.windStrength > 0" class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
          <span>{{ languageStore.t('windCorrection') }}</span>
        </div>
      </div>
    </div>
  </div>
</template> 