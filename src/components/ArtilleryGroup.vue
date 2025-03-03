<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue';
import { useLanguageStore } from '../stores/languageStore';
import { useGroupStore } from '../stores/groupStore';
import { useArtilleryStore } from '../stores/artilleryStore';

const languageStore = useLanguageStore();
const groupStore = useGroupStore();
const artilleryStore = useArtilleryStore();

// Initialize on component mount
onMounted(() => {
  groupStore.loadSavedSettings();
  
  // Auto-join if we have a saved group
  if (groupStore.groupName && groupStore.playerName) {
    groupStore.joinGroup();
  }
});

// Clean up WebSocket connection on component unmount
onBeforeUnmount(() => {
  if (groupStore.isConnected) {
    groupStore.disconnectGroup();
  }
});
</script>

<template>
  <div class="artillery-group mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
      <div class="flex items-center flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
          <path fill="currentColor" d="M12.3,12.22A4.92,4.92,0,0,0,14,8.5a5,5,0,0,0-10,0,4.92,4.92,0,0,0,1.7,3.72A8,8,0,0,0,1,19.5a1,1,0,0,0,2,0,6,6,0,0,1,12,0,1,1,0,0,0,2,0A8,8,0,0,0,12.3,12.22ZM9,11.5a3,3,0,1,1,3-3A3,3,0,0,1,9,11.5Zm9.74.32A5,5,0,0,0,15,3.5a1,1,0,0,0,0,2,3,3,0,0,1,3,3,3,3,0,0,1-1.5,2.59,1,1,0,0,0-.5.84,1,1,0,0,0,.45.86l.39.26.13.07a7,7,0,0,1,4,6.38,1,1,0,0,0,2,0A9,9,0,0,0,18.74,11.82Z"></path>
        </svg>
        {{ languageStore.t('artilleryGroup') }}
      </div>
      <div v-if="groupStore.isConnected">
        <span class="text-green-600 dark:text-green-500 flex items-center text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          {{ languageStore.t('connectedToGroup') }}&nbsp;<strong>{{ groupStore.groupName }}</strong>&nbsp;{{ languageStore.t('connectedAs') }}&nbsp;<strong>{{ groupStore.playerName }}</strong>
        </span>
      </div>
      <div @click="groupStore.toggleGroupMenu" class="cursor-pointer">
        <svg v-if="groupStore.artilleryGroupMenuOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
          <path fill="currentColor" d="M17,13.41,12.71,9.17a1,1,0,0,0-1.42,0L7.05,13.41a1,1,0,0,0,0,1.42,1,1,0,0,0,1.41,0L12,11.29l3.54,3.54a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29A1,1,0,0,0,17,13.41Z"></path>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-2 flex-shrink-0">
          <path fill="currentColor" d="M17,9.17a1,1,0,0,0-1.41,0L12,12.71,8.46,9.17a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.42l4.24,4.24a1,1,0,0,0,1.42,0L17,10.59A1,1,0,0,0,17,9.17Z"></path>
        </svg>
      </div>
    </h3>
    
    <div v-if="!groupStore.isConnected && groupStore.artilleryGroupMenuOpen" class="mt-3">
      <!-- Group name, player name, and join button -->
      <form @submit.prevent="groupStore.joinGroup" class="flex gap-4 items-end">
        <!-- Group name input -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('groupName') }}
          </label>
          <div class="relative">
            <input 
              v-model="groupStore.groupName"
              type="text" 
              :placeholder="languageStore.t('enterGroupName')"
              class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
            />
          </div>
        </div>
        
        <!-- Player name input -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('playerName') }}
          </label>
          <input 
            v-model="groupStore.playerName"
            type="text" 
            :placeholder="languageStore.t('enterPlayerName')"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          />
        </div>
              
        <!-- Password field -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ languageStore.t('groupPassword') }}
          </label>
          <input 
            v-model="groupStore.groupPassword"
            type="password" 
            :placeholder="languageStore.t('optionalPassword')"
            class="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-black dark:text-white"
          />
        </div>
        
        <!-- Join button -->
        <button 
          class="px-3 py-2 border border-green-700 dark:border-green-900 rounded-md bg-green-700 hover:bg-green-800 dark:bg-green-900 dark:hover:bg-green-800 text-white cursor-pointer"
          :disabled="!groupStore.canJoin"
          :title="languageStore.t('join')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
            <path fill="currentColor" d="M21,10.5H20v-1a1,1,0,0,0-2,0v1H17a1,1,0,0,0,0,2h1v1a1,1,0,0,0,2,0v-1h1a1,1,0,0,0,0-2Zm-7.7,1.72A4.92,4.92,0,0,0,15,8.5a5,5,0,0,0-10,0,4.92,4.92,0,0,0,1.7,3.72A8,8,0,0,0,2,19.5a1,1,0,0,0,2,0,6,6,0,0,1,12,0,1,1,0,0,0,2,0A8,8,0,0,0,13.3,12.22ZM10,11.5a3,3,0,1,1,3-3A3,3,0,0,1,10,11.5Z"></path>
          </svg>
        </button>
      </form>
    </div>
    
    <!-- Connected state info -->
    <div v-else-if="groupStore.artilleryGroupMenuOpen" class="mt-3 flex justify-between items-center">
      <!-- Member list -->
      <div class="flex gap-2 items-center">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {{ languageStore.t('membersOnline') }}: 
        </div>
        <div class="overflow-y-auto">
          <div class="flex flex-wrap gap-2">
            <div 
              v-for="member in groupStore.uniqueMembers" 
              :key="member.id" 
              class="text-sm px-4 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full flex items-center"
            >
              <div class="w-2 h-2 bg-green-700 hover:bg-green-800 rounded-full mr-1.5"></div>
              {{ member.name }}
            </div>
            <div 
              v-if="groupStore.uniqueMembers.length === 0" 
              class="text-sm text-gray-500 dark:text-gray-400 py-1"
            >
              {{ languageStore.t('loadingMembers') }}
            </div>
          </div>
        </div>
      </div>

      <button 
        @click="groupStore.disconnectGroup" 
        class="text-sm px-2 py-1 text-white rounded m-0 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800"
      >
        {{ languageStore.t('disconnect') }}
      </button>
    </div>
    
    <!-- Error message -->
    <div v-if="groupStore.connectionError" class="mt-2 text-sm text-red-600 dark:text-red-500">
      {{ languageStore.t(groupStore.connectionError) }}
    </div>
  </div>
</template> 