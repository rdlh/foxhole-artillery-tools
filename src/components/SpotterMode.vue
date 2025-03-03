<script setup lang="ts">
import { watch } from 'vue';
import { useArtilleryStore } from '../stores/artilleryStore';
import { useGroupStore } from '../stores/groupStore';
import { useLanguageStore } from '../stores/languageStore';

// Use stores instead of local state
const artilleryStore = useArtilleryStore();
const languageStore = useLanguageStore();
const groupStore = useGroupStore();

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
</script>

<template>
  <div class="max-w-8xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
    <!-- Form Section -->
    <div class="md:col-span-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <form class="space-y-6">
        <!-- Add Weapon Selection section -->
        <div class="flex gap-4 items-end">
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

        <!-- Spotter to Target section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
              <path fill="currentColor" d="M3,9A1,1,0,0,0,4,8V5A1,1,0,0,1,5,4H8A1,1,0,0,0,8,2H5A3,3,0,0,0,2,5V8A1,1,0,0,0,3,9ZM8,20H5a1,1,0,0,1-1-1V16a1,1,0,0,0-2,0v3a3,3,0,0,0,3,3H8a1,1,0,0,0,0-2Zm9-7a1,1,0,0,0,0-2H15.86A4,4,0,0,0,13,8.14V7a1,1,0,0,0-2,0V8.14A4,4,0,0,0,8.14,11H7a1,1,0,0,0,0,2H8.14A4,4,0,0,0,11,15.86V17a1,1,0,0,0,2,0V15.86A4,4,0,0,0,15.86,13Zm-5,1a2,2,0,1,1,2-2A2,2,0,0,1,12,14Zm9,1a1,1,0,0,0-1,1v3a1,1,0,0,1-1,1H16a1,1,0,0,0,0,2h3a3,3,0,0,0,3-3V16A1,1,0,0,0,21,15ZM19,2H16a1,1,0,0,0,0,2h3a1,1,0,0,1,1,1V8a1,1,0,0,0,2,0V5A3,3,0,0,0,19,2Z"></path>
            </svg>
            {{ languageStore.t('spotterWord') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4 mx-1 flex-shrink-0">
              <path fill="currentColor" d="M17.92,11.62a1,1,0,0,0-.21-.33l-5-5a1,1,0,0,0-1.42,1.42L14.59,11H7a1,1,0,0,0,0,2h7.59l-3.3,3.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0l5-5a1,1,0,0,0,.21-.33A1,1,0,0,0,17.92,11.62Z"></path>
            </svg>
            {{ languageStore.t('targetWord') }}
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('distance') }}
              </label>
              <input
                v-model.number="artilleryStore.spotterToTargetDistance"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('azimuth') }}
              </label>
              <input
                v-model.number="artilleryStore.spotterToTargetAzimuth"
                type="number"
                step="0.1"
                min="0"
                max="360"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('degrees')"
              />
            </div>
          </div>
        </div>

        <!-- Spotter to Artillery section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
              <path fill="currentColor" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,17.93V19a1,1,0,0,0-2,0v.93A8,8,0,0,1,4.07,13H5a1,1,0,0,0,0-2H4.07A8,8,0,0,1,11,4.07V5a1,1,0,0,0,2,0V4.07A8,8,0,0,1,19.93,11H19a1,1,0,0,0,0,2h.93A8,8,0,0,1,13,19.93ZM15.14,7.55l-5,2.12a1,1,0,0,0-.52.52l-2.12,5a1,1,0,0,0,.21,1.1,1,1,0,0,0,.7.3.93.93,0,0,0,.4-.09l5-2.12a1,1,0,0,0,.52-.52l2.12-5a1,1,0,0,0-1.31-1.31Zm-2.49,5.1-2.28,1,1-2.28,2.28-1Z"></path>
            </svg>
            {{ languageStore.t('spotterWord') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4 mx-1 flex-shrink-0">
              <path fill="currentColor" d="M17.92,11.62a1,1,0,0,0-.21-.33l-5-5a1,1,0,0,0-1.42,1.42L14.59,11H7a1,1,0,0,0,0,2h7.59l-3.3,3.29a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0l5-5a1,1,0,0,0,.21-.33A1,1,0,0,0,17.92,11.62Z"></path>
            </svg>
            {{ languageStore.t('artilleryWord') }}
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('distance') }}
              </label>
              <input
                v-model.number="artilleryStore.spotterToArtilleryDistance"
                type="number"
                step="0.1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('azimuth') }}
              </label>
              <input
                v-model.number="artilleryStore.spotterToArtilleryAzimuth"
                type="number"
                step="0.1"
                min="0"
                max="360"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('degrees')"
              />
            </div>
          </div>
        </div>

        <!-- Correction section -->
        <div v-if="artilleryStore.result" class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
              <path fill="currentColor" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm1,17.93V19a1,1,0,0,0-2,0v.93A8,8,0,0,1,4.07,13H5a1,1,0,0,0,0-2H4.07A8,8,0,0,1,11,4.07V5a1,1,0,0,0,2,0V4.07A8,8,0,0,1,19.93,11H19a1,1,0,0,0,0,2h.93A8,8,0,0,1,13,19.93ZM15.14,7.55l-5,2.12a1,1,0,0,0-.52.52l-2.12,5a1,1,0,0,0,.21,1.1,1,1,0,0,0,.7.3.93.93,0,0,0,.4-.09l5-2.12a1,1,0,0,0,.52-.52l2.12-5a1,1,0,0,0-1.31-1.31Zm-2.49,5.1-2.28,1,1-2.28,2.28-1Z"></path>
            </svg>
            {{ languageStore.t('correctionWord') }}
            <span class="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
              {{ languageStore.t('correctionHint') }}
            </span>
          </h3>
          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('left') }}
              </label>
              <input
                v-model.number="artilleryStore.correctionFromSpotterLeft"
                type="number"
                step="1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('right') }}
              </label>
              <input
                v-model.number="artilleryStore.correctionFromSpotterRight"
                type="number"
                step="1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('up') }}
              </label>
              <input
                v-model.number="artilleryStore.correctionFromSpotterUp"
                type="number"
                step="1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ languageStore.t('down') }}
              </label>
              <input
                v-model.number="artilleryStore.correctionFromSpotterDown"
                type="number"
                step="1"
                min="0"
                class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
                :placeholder="languageStore.t('meters')"
              />
            </div>
          </div>
          <div v-if="artilleryStore.canManageWind" class="flex gap-4">
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
          <div v-else-if="artilleryStore.weapon" class="flex-1">
            <p class="text-sm text-gray-800 dark:text-gray-300">
              {{ languageStore.t('weaponNotAvailable') }}
            </p>
          </div>
          <div v-else class="flex-1">
            <p class="text-sm text-gray-800 dark:text-gray-300">
              {{ languageStore.t('weaponSelectionRequired') }}
            </p>
          </div>
        </div>
      </form>

      <!-- Results section -->
      <div
        v-if="artilleryStore.result"
        class="mt-8 p-4 border has-class-[valid]:border-green-500 has-class-[invalid]:border-red-500 has-class-[warning]:border-yellow-500 rounded-md has-class-[valid]:bg-green-200 has-class-[invalid]:bg-red-200 has-class-[warning]:bg-yellow-200 has-class-[valid]:dark:bg-green-900 has-class-[invalid]:dark:bg-red-900 has-class-[warning]:dark:bg-yellow-900 has-class-[valid]:dark:border-green-700 has-class-[invalid]:dark:border-red-700 has-class-[warning]:dark:border-yellow-700"
        :class="{
          'valid': artilleryStore.resultValid.isValid,
          'invalid': !artilleryStore.resultValid.isValid && artilleryStore.resultValid.type === 'error',
          'warning': !artilleryStore.resultValid.isValid && artilleryStore.resultValid.type === 'warning'
        }"
      >
        <h3 class="text-lg font-semibold text-black dark:text-white mb-2">
          {{ languageStore.t('artilleryFiringSolution') }}
        </h3>
        <div class="flex gap-4">
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
        
        <!-- Save button with icon -->
        <button
          v-if="artilleryStore.resultValid.isValid"
          @click="artilleryStore.saveCalculation()"
          class="w-full bg-green-700 hover:bg-green-800 dark:bg-green-700 dark:hover:bg-green-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-5 h-5 mr-2 -mt-1">
            <path fill="currentColor" d="M16,2H8A3,3,0,0,0,5,5V21a1,1,0,0,0,.5.87,1,1,0,0,0,1,0L12,18.69l5.5,3.18A1,1,0,0,0,18,22a1,1,0,0,0,.5-.13A1,1,0,0,0,19,21V5A3,3,0,0,0,16,2Zm1,17.27-4.5-2.6a1,1,0,0,0-1,0L7,19.27V5A1,1,0,0,1,8,4h8a1,1,0,0,1,1,1Z"></path>
          </svg>
          {{ languageStore.t('saveToHistory') }}
        </button>
        <p v-else-if="artilleryStore.resultValid.error" class="font-semibold text-black dark:text-white mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-5 h-5 mr-2"><path fill="currentColor" d="M12,16a1,1,0,1,0,1,1A1,1,0,0,0,12,16Zm10.67,1.47-8.05-14a3,3,0,0,0-5.24,0l-8,14A3,3,0,0,0,3.94,22H20.06a3,3,0,0,0,2.61-4.53Zm-1.73,2a1,1,0,0,1-.88.51H3.94a1,1,0,0,1-.88-.51,1,1,0,0,1,0-1l8-14a1,1,0,0,1,1.78,0l8.05,14A1,1,0,0,1,20.94,19.49ZM12,8a1,1,0,0,0-1,1v4a1,1,0,0,0,2,0V9A1,1,0,0,0,12,8Z"></path></svg>
          {{ languageStore.t(artilleryStore.resultValid.error) }}
        </p>
      </div>

      <!-- Error message -->
      <div v-if="artilleryStore.calculationError" class="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
        {{ artilleryStore.calculationError }}
      </div>
    </div>

    <!-- Visualization and History Section -->
    <div class="md:col-span-2 space-y-6">
      <!-- Visualization section with zoom controls -->
      <div v-if="artilleryStore.result" class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-800 text-black dark:text-white mb-4 flex justify-between items-center">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2">
              <path fill="currentColor" d="M21.32,5.05l-6-2h-.07a.7.7,0,0,0-.14,0h-.23l-.13,0h-.07L9,5,3.32,3.05a1,1,0,0,0-.9.14A1,1,0,0,0,2,4V18a1,1,0,0,0,.68.95l6,2h0a1,1,0,0,0,.62,0h0L15,19.05,20.68,21A1.19,1.19,0,0,0,21,21a.94.94,0,0,0,.58-.19A1,1,0,0,0,22,20V6A1,1,0,0,0,21.32,5.05ZM8,18.61,4,17.28V5.39L8,6.72Zm6-1.33-4,1.33V6.72l4-1.33Zm6,1.33-4-1.33V5.39l4,1.33Z"></path>
            </svg>
            {{ languageStore.t('visualization') }}
          </div>
          <!-- Zoom controls -->
          <div class="flex space-x-1">
            <button 
              @click="artilleryStore.zoomIn()" 
              class="p-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5">
                <path fill="currentColor" d="M19,11H13V5a1,1,0,0,0-2,0v6H5a1,1,0,0,0,0,2h6v6a1,1,0,0,0,2,0V13h6a1,1,0,0,0,0-2Z"></path>
              </svg>
            </button>
            <button 
              @click="artilleryStore.zoomOut()" 
              class="p-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5">
                <path fill="currentColor" d="M19,11H5a1,1,0,0,0,0,2H19a1,1,0,0,0,0-2Z"></path>
              </svg>
            </button>
          </div>
        </h3>
        <slot name="triangle-visualization"></slot>
      </div>

      <!-- Placeholder when form is not valid -->
      <div v-else class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold text-gray-800 text-black dark:text-white mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="inline-block w-5 h-5 mr-2 -mt-1">
            <path fill="currentColor" d="M21.32,5.05l-6-2h-.07a.7.7,0,0,0-.14,0h-.23l-.13,0h-.07L9,5,3.32,3.05a1,1,0,0,0-.9.14A1,1,0,0,0,2,4V18a1,1,0,0,0,.68.95l6,2h0a1,1,0,0,0,.62,0h0L15,19.05,20.68,21A1.19,1.19,0,0,0,21,21a.94.94,0,0,0,.58-.19A1,1,0,0,0,22,20V6A1,1,0,0,0,21.32,5.05ZM8,18.61,4,17.28V5.39L8,6.72Zm6-1.33-4,1.33V6.72l4-1.33Zm6,1.33-4-1.33V5.39l4,1.33Z"></path>
          </svg>
          {{ languageStore.t('visualization') }}
        </h3>
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          {{ languageStore.t('fillInAllFieldsToSeeVisualization') }}
        </div>
      </div>

      <!-- Calculation History -->
      <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <slot name="calculation-history"></slot>
      </div>
    </div>
  </div>
</template>
