import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

import { useArtilleryStore } from './artilleryStore';

import type { Member } from '../types/member';

export const useGroupStore = defineStore('group', () => {
  // State
  const socket = ref<WebSocket | null>(null);
  const groupName = ref<string>('');
  const playerName = ref<string>('');
  const isConnected = ref<boolean>(false);
  const memberCount = ref<number>(0);
  const groupMembers = ref<Member[]>([]);
  const connectionError = ref<string | null>(null);
  const groupPassword = ref('');
  const artilleryGroupMenuOpen = ref<boolean>(false);
  const playerId = ref(getPlayerUUID());
  const artilleryStore = useArtilleryStore();

  // UUID generation function
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get or create player UUID
  function getPlayerUUID(): string {
    let uuid = localStorage.getItem('artilleryPlayerUUID');
    if (!uuid) {
      uuid = generateUUID();
      localStorage.setItem('artilleryPlayerUUID', uuid);
    }
    return uuid;
  }

  // Computed properties
  const canJoin = computed(() => {
    return playerName.value.trim() !== '' && groupName.value.trim() !== '';
  });

  const uniqueMembers = computed(() => {
    const uniqueNames = new Set();
    return groupMembers.value.filter(member => {
      if (uniqueNames.has(member.name)) {
        return false;
      }
      uniqueNames.add(member.name);
      return true;
    });
  });

  // Setup watchers for localStorage
  watch(groupName, (newValue) => {
    localStorage.setItem('artilleryGroup', newValue);
  });

  watch(playerName, (newValue) => {
    localStorage.setItem('artilleryPlayerName', newValue);
  });

  watch(groupPassword, (newValue) => {
    localStorage.setItem('artilleryGroupPassword', newValue);
  });

  watch(artilleryGroupMenuOpen, (newValue) => {
    localStorage.setItem('artilleryGroupMenuOpen', newValue.toString());
  });

  // Load saved settings
  const loadSavedSettings = () => {
    // Load saved group name if exists
    const savedGroup = localStorage.getItem('artilleryGroup');
    if (savedGroup) {
      groupName.value = savedGroup;
    }
    
    // Load player name if exists
    const savedName = localStorage.getItem('artilleryPlayerName');
    if (savedName) {
      playerName.value = savedName;
    }
    
    // Load saved password if exists
    const savedPassword = localStorage.getItem('artilleryGroupPassword');
    if (savedPassword) {
      groupPassword.value = savedPassword;
    }
    
    // Load saved artilleryGroupMenuOpen if exists
    const savedArtilleryGroupMenuOpen = localStorage.getItem('artilleryGroupMenuOpen');
    if (savedArtilleryGroupMenuOpen) {
      artilleryGroupMenuOpen.value = savedArtilleryGroupMenuOpen === 'true';
    }
  };

  // Actions
  // Function to set up WebSocket handlers
  const setupWebSocketHandlers = () => {
    if (!socket.value) return;

    socket.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
         if (message.type === 'inputUpdate') {
          artilleryStore.handleReceivedCalculation(message.data);
        } else if (message.type === 'groupInfo') {
          // Connection confirmed - update group member information
          isConnected.value = true;
          connectionError.value = null;
          memberCount.value = message.data.memberCount;
          groupMembers.value = message.data.members || [];
        } else if (message.type === 'error' && message.data.code === 'auth_failed') {
          // Handle authentication failure
          connectionError.value = 'incorrectPassword';
          isConnected.value = false;
          
          // Close the socket to clean up
          if (socket.value) {
            socket.value.close();
            socket.value = null;
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    socket.value.onclose = () => {
      isConnected.value = false;
      socket.value = null;
    };

    socket.value.onerror = () => {
      connectionError.value = 'connectionError';
      isConnected.value = false;
    };
  };

  // Connect to a group
  const joinGroup = async () => {
    if (!canJoin.value) return;
    
    try {
      connectionError.value = null;
      
      // Create WebSocket connection if it doesn't exist
      if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
        // Use secure WebSocket in production, non-secure in development
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = import.meta.env.PROD 
          ? `${protocol}//${window.location.host}/artillery` 
          : 'ws://localhost:3000/artillery';
        
        socket.value = new WebSocket(wsUrl);
        
        socket.value.onopen = () => {
          // Send join message with player UUID, password and input values
          socket.value?.send(JSON.stringify({
            type: 'join',
            groupName: groupName.value,
            playerName: playerName.value,
            playerId: playerId.value,
            password: groupPassword.value,
            inputs: {
              spotterToTarget: {
                distance: artilleryStore.spotterToTargetDistance,
                azimuth: artilleryStore.spotterToTargetAzimuth
              },
              spotterToArtillery: {
                distance: artilleryStore.spotterToArtilleryDistance,
                azimuth: artilleryStore.spotterToArtilleryAzimuth
              }
            }
          }));
        };
        
        // Set up event handlers
        setupWebSocketHandlers();
      }
    } catch (error) {
      console.error('Error joining group:', error);
      connectionError.value = 'connectionError';
    }
  };

  // Disconnect from group
  const disconnectGroup = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
    }
    isConnected.value = false;
    groupName.value = '';
    groupPassword.value = '';
  };

  // Send input update to group
  const sendInputUpdate = () => {
    if (!socket.value || socket.value.readyState !== WebSocket.OPEN || !isConnected.value) {
      return;
    }
    
    socket.value.send(JSON.stringify({
      type: 'inputUpdate',
      inputs: {
        spotterToTarget: {
          distance: artilleryStore.spotterToTargetDistance,
          azimuth: artilleryStore.spotterToTargetAzimuth
        },
        spotterToArtillery: {
          distance: artilleryStore.spotterToArtilleryDistance,
          azimuth: artilleryStore.spotterToArtilleryAzimuth
        }
      }
    }));
  };

  // Toggle artillery group menu
  const toggleGroupMenu = () => {
    artilleryGroupMenuOpen.value = !artilleryGroupMenuOpen.value;
  };

  return {
    // State
    socket,
    groupName,
    playerName,
    isConnected,
    memberCount,
    groupMembers,
    connectionError,
    groupPassword,
    artilleryGroupMenuOpen,
    playerId,
    
    // Computed
    canJoin,
    uniqueMembers,
    
    // Actions
    loadSavedSettings,
    joinGroup,
    disconnectGroup,
    sendInputUpdate,
    toggleGroupMenu
  };
}); 