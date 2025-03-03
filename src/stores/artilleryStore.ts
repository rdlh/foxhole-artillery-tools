import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { calculateFiringSolution, calculateFiringSolutionFromPositions } from '../utils/artilleryCalculations';
import { weapons } from '../weapons';  // Import the weapons data
import { maps } from '../maps';  // Import the maps data

// Define types
import type { Calculation } from '../types/calculation';
import type { Weapon } from '../types/weapon';
import type { Map } from '../types/map';

export const useArtilleryStore = defineStore('artillery', () => {
  // Use weapons directly without mapping
  const availableWeapons = weapons as Weapon[];
  const availableMaps = maps as Map[];

  const mode = ref<'spotter' | 'map'>('spotter');
  const weapon = ref<Weapon | null>(null);
  const faction = ref<'colonials' | 'wardens' | null>(null);
  const map = ref<Map | null>(null);

  // Filter weapons by selected faction
  const filteredWeapons = computed(() => {
    return availableWeapons.filter(availableWeapon => 
      availableWeapon.faction === 'all' || availableWeapon.faction === faction.value
    );
  });

  const weaponsGroupedByFaction = computed(() => {
    return availableWeapons.reduce((acc, weapon) => {
      acc[weapon.faction] = acc[weapon.faction] || [];
      acc[weapon.faction].push(weapon as Weapon);
      return acc;
    }, {} as Record<string, Weapon[]>);
  });

  const canManageWind = computed(() => {
    return weapon.value?.windModifier !== undefined;
  });

  // Input fields with reactive state
  const spotterToTargetDistance = ref<number | null>(null);
  const spotterToTargetAzimuth = ref<number | null>(null);
  const spotterToArtilleryDistance = ref<number | null>(null);
  const spotterToArtilleryAzimuth = ref<number | null>(null);

  const correctionFromSpotterLeft = ref<number>(0);
  const correctionFromSpotterRight = ref<number>(0);
  const correctionFromSpotterUp = ref<number>(0);
  const correctionFromSpotterDown = ref<number>(0);

  const windStrength = ref<number>(0);
  const windDirection = ref<number>(0);

  const mapArtilleryPosition = ref<{ x: number, y: number } | null>(null);
  const mapTargetPosition = ref<{ x: number, y: number } | null>(null);

  // Form validation
  const isFormValid = computed(() => {
    return typeof spotterToTargetDistance.value === 'number' && 
           typeof spotterToTargetAzimuth.value === 'number' && 
           typeof spotterToArtilleryDistance.value === 'number' && 
           typeof spotterToArtilleryAzimuth.value === 'number';
  });

  const visualizationZoom = ref<number>(1.0);

  // Result variables
  const calculationError = ref<string | null>(null);
  const calculationSource = ref<'user' | 'group'>('user');

  // Result as a computed property (getter)
  const result = computed(() => {
    if (!isFormValid.value) return null;
    
    try {
      if (mode.value === 'spotter') {
        return calculateFiringSolution(
          spotterToTargetDistance.value!,
          spotterToTargetAzimuth.value!,
          spotterToArtilleryDistance.value!,
          spotterToArtilleryAzimuth.value!,
          correctionFromSpotterLeft.value,
          correctionFromSpotterRight.value,
          correctionFromSpotterUp.value,
          correctionFromSpotterDown.value,
          windStrength.value,
          windDirection.value,
          weapon.value!
        );
      } else if (mode.value === 'map') {
        if (!mapArtilleryPosition.value || !mapTargetPosition.value) return null;

        return calculateFiringSolutionFromPositions(
          mapArtilleryPosition.value!.x,
          mapArtilleryPosition.value!.y,
          mapTargetPosition.value!.x,
          mapTargetPosition.value!.y,
          windStrength.value,
          windDirection.value,
          weapon.value!
        );
      }

      calculationError.value = null;
    } catch (error) {
      console.error('Error calculating firing solution:', error);
      calculationError.value = 'calculationError';
      return null;
    }
  });

  const resultValid = computed(() => {
    if (!result.value) return { isValid: false, type: 'error' };

    if (spotterToTargetDistance.value! < (result.value.accuracy || 20)) return {
      isValid: false,
      type: 'warning',
      error: 'spotterTooClose'
    };
    
    if (!weapon.value) return { isValid: true };

    if (weapon.value.min > result.value.distance) return {
      isValid: false,
      type: 'error',
      error: 'distanceTooShort'
    };

    if (weapon.value.max < result.value.distance) return {
      isValid: false,
      type: 'error',
      error: 'distanceTooLong'
    };

    return { isValid: true };
  });

  // History of calculations
  const calculationHistory = ref<Calculation[]>([]);

  // Save calculation history to localStorage
  const saveHistoryToLocalStorage = () => {
    try {
      // Convert Date objects to strings for JSON serialization
      const historyForStorage = calculationHistory.value.map((calc: Calculation) => ({
        ...calc,
        timestamp: calc.timestamp.toISOString()
      }));
      localStorage.setItem('artilleryCalculationHistory', JSON.stringify(historyForStorage));
    } catch (error) {
      console.error('Failed to save calculation history to localStorage:', error);
    }
  };

  // Load calculation history from localStorage
  const loadHistoryFromLocalStorage = () => {
    try {
      const storedHistory = localStorage.getItem('artilleryCalculationHistory');
      if (storedHistory) {
        // Parse JSON and convert timestamp strings back to Date objects
        const parsedHistory = JSON.parse(storedHistory);
        calculationHistory.value = parsedHistory.map((calc: any) => ({
          ...calc,
          timestamp: new Date(calc.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load calculation history from localStorage:', error);
      calculationHistory.value = [];
    }
  };

  watch(correctionFromSpotterLeft, (newCorrection) => {
    if (newCorrection > 0) {
      correctionFromSpotterRight.value = 0;
    }
  });

  watch(correctionFromSpotterRight, (newCorrection) => {
    if (newCorrection > 0) {
      correctionFromSpotterLeft.value = 0;
    }
  });

  watch(correctionFromSpotterUp, (newCorrection) => {
    if (newCorrection > 0) {
      correctionFromSpotterDown.value = 0;
    }
  });

  watch(correctionFromSpotterDown, (newCorrection) => {
    if (newCorrection > 0) {
      correctionFromSpotterUp.value = 0;
    }
  });

  watch(windDirection, (newValue) => {
    if (newValue > 360) {
      windDirection.value = newValue - 360;
    }
  });

  watch(mode, (newValue) => {
    if (newValue) {
      localStorage.setItem('artillerymode', newValue);
    } else {
      localStorage.removeItem('artillerymode');
    }
  });

  watch(map, (newValue) => {
    if (newValue) {
      localStorage.setItem('artillerymap', newValue.name);
    } else {
      localStorage.removeItem('artillerymap');
    }
  });

  watch(faction, (newValue) => {
    if (newValue) {
      localStorage.setItem('artilleryfaction', newValue);
    } else {
      localStorage.removeItem('artilleryfaction');
    }
  });

  watch(weapon, (newValue) => {
    if (newValue) {
      localStorage.setItem('artilleryweapon', newValue.name);
    } else {
      localStorage.removeItem('artilleryweapon');
    }
  });

  watch(mapArtilleryPosition, (newValue) => {
    if (newValue) {
      localStorage.setItem('artilleryMapArtilleryPosition', JSON.stringify(newValue));
    } else {
      localStorage.removeItem('artilleryMapArtilleryPosition');
    }
  });

  watch(mapTargetPosition, (newValue) => {
    if (newValue) {
      localStorage.setItem('artilleryMapTargetPosition', JSON.stringify(newValue));
    } else {
      localStorage.removeItem('artilleryMapTargetPosition');
    }
  });

  const watchedValues = [
    { name: 'spotterToTargetDistance', variable: spotterToTargetDistance },
    { name: 'spotterToTargetAzimuth', variable: spotterToTargetAzimuth },
    { name: 'spotterToArtilleryDistance', variable: spotterToArtilleryDistance },
    { name: 'spotterToArtilleryAzimuth', variable: spotterToArtilleryAzimuth },
    { name: 'correctionFromSpotterLeft', variable: correctionFromSpotterLeft },
    { name: 'correctionFromSpotterRight', variable: correctionFromSpotterRight },
    { name: 'correctionFromSpotterUp', variable: correctionFromSpotterUp },
    { name: 'correctionFromSpotterDown', variable: correctionFromSpotterDown },
    { name: 'windStrength', variable: windStrength },
    { name: 'windDirection', variable: windDirection }
  ]
  
  watchedValues.forEach(watchedValue => {
    watch(watchedValue.variable, (newValue) => {
      if (newValue) {
        localStorage.setItem(`artillery${watchedValue.name}`, newValue.toString());
      } else {
        localStorage.removeItem(`artillery${watchedValue.name}`);
      }
    });
  });

  // Load saved settings
  const loadSavedSettings = () => {
    // Load saved group name if exists
    const storedMode = localStorage.getItem('artillerymode');
    if (storedMode) {
      mode.value = storedMode as 'spotter' | 'map';
    }

    const storedMapArtilleryPosition = localStorage.getItem('artilleryMapArtilleryPosition');
    if (storedMapArtilleryPosition) {
      mapArtilleryPosition.value = JSON.parse(storedMapArtilleryPosition);
    }

    const storedMapTargetPosition = localStorage.getItem('artilleryMapTargetPosition');
    if (storedMapTargetPosition) {
      mapTargetPosition.value = JSON.parse(storedMapTargetPosition);
    }

    // Load saved group name if exists
    const storedMap = localStorage.getItem('artillerymap');
    if (storedMap) {
      map.value = availableMaps.find(map => map.name === storedMap) as Map;
    }

    // Load saved group name if exists
    const storedFaction = localStorage.getItem('artilleryfaction');
    if (storedFaction) {
      faction.value = storedFaction as 'colonials' | 'wardens';
    }

    const storedWeapon = localStorage.getItem('artilleryweapon');
    if (storedWeapon) {
      weapon.value = availableWeapons.find(weapon => weapon.name === storedWeapon) as Weapon;
    }

    watchedValues.forEach(value => {
      const storedValue = localStorage.getItem(`artillery${value.name}`);
      if (storedValue) {
        value.variable.value = parseFloat(storedValue);
      }
    });
  };

  // Calculate the firing solution
  const calculateSolution = () => {
    console.log(isFormValid.value);
    if (!isFormValid.value) return;
    
    calculationError.value = null;
    calculationSource.value = 'user';
    
    // The actual calculation happens in the computed property
    if (result.value === null && calculationError.value === null) {
      calculationError.value = 'calculationError';
    }
  };

  // Save calculation
  const saveCalculation = () => {
    if (!result.value || !isFormValid.value) return;
    
    const calculation = {
      id: Date.now(),
      spotterToTarget: { 
        distance: spotterToTargetDistance.value!, 
        azimuth: spotterToTargetAzimuth.value! 
      },
      spotterToArtillery: { 
        distance: spotterToArtilleryDistance.value!, 
        azimuth: spotterToArtilleryAzimuth.value! 
      },
      artilleryToTarget: { 
        distance: result.value.distance, 
        azimuth: result.value.azimuth 
      },
      weapon: weapon.value,
      timestamp: new Date()
    };
    
    // Add to local history
    calculationHistory.value.unshift(calculation);
    
    // Keep only the last 5 calculations
    if (calculationHistory.value.length > 5) {
      calculationHistory.value = calculationHistory.value.slice(0, 5);
    }

    // Save to localStorage
    saveHistoryToLocalStorage();
    
    return calculation;
  };

  // Recall a calculation from history
  const recallCalculation = (calculation: Calculation) => {
    spotterToTargetDistance.value = calculation.spotterToTarget.distance;
    spotterToTargetAzimuth.value = calculation.spotterToTarget.azimuth;
    spotterToArtilleryDistance.value = calculation.spotterToArtillery.distance;
    spotterToArtilleryAzimuth.value = calculation.spotterToArtillery.azimuth;
    // No need to set result, it will be computed
  };

  // Handle calculation received from other group members
  const handleReceivedCalculation = (calculation: Calculation) => {
    // Extract values from the received calculation
    spotterToTargetDistance.value = calculation.spotterToTarget.distance;
    spotterToTargetAzimuth.value = calculation.spotterToTarget.azimuth;
    spotterToArtilleryDistance.value = calculation.spotterToArtillery.distance;
    spotterToArtilleryAzimuth.value = calculation.spotterToArtillery.azimuth;
    calculationSource.value = 'group';
    // Will be called from component which will handle the calculation
  };

  // Function to clear calculation history
  const clearCalculationHistory = () => {
    calculationHistory.value = [];
    saveHistoryToLocalStorage();
  };

  // Function to zoom in on the visualization
  const zoomIn = () => {
    if (visualizationZoom.value < 2.0) {
      visualizationZoom.value += 0.1;
    }
  };

  // Function to zoom out on the visualization
  const zoomOut = () => {
    if (visualizationZoom.value > 0.1) {
      visualizationZoom.value -= 0.1;
    }
  };

  return {
    // State
    mode,
    weapon,
    map,
    availableWeapons,
    availableMaps,
    spotterToTargetDistance,
    spotterToTargetAzimuth,
    spotterToArtilleryDistance,
    spotterToArtilleryAzimuth,
    correctionFromSpotterLeft,
    correctionFromSpotterRight,
    correctionFromSpotterUp,
    correctionFromSpotterDown,
    windStrength,
    windDirection,
    canManageWind,
    result,
    resultValid,
    calculationError,
    calculationSource,
    calculationHistory,
    isFormValid,
    visualizationZoom,
    faction,
    filteredWeapons,
    weaponsGroupedByFaction,
    mapArtilleryPosition,
    mapTargetPosition,

    // Actions
    loadSavedSettings,
    calculateSolution,
    saveCalculation,
    recallCalculation,
    handleReceivedCalculation,
    loadHistoryFromLocalStorage,
    saveHistoryToLocalStorage,
    clearCalculationHistory,
    zoomIn,
    zoomOut
  };
}); 