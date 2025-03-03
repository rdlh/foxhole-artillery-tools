import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  // State
  const isDarkMode = ref(true);

  // Initialize theme from localStorage or default to dark
  const initTheme = () => {
    const savedTheme = localStorage.getItem('artilleryCalculatorTheme');
    if (savedTheme) {
      isDarkMode.value = savedTheme === 'dark';
      applyTheme();
    } else {
      // Default to dark mode
      isDarkMode.value = true;
      applyTheme();
    }
  };

  // Apply theme based on current state
  const applyTheme = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference to localStorage
    localStorage.setItem('artilleryCalculatorTheme', isDarkMode.value ? 'dark' : 'light');
  };

  // Toggle between dark and light mode
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    applyTheme();
  };

  return {
    isDarkMode,
    initTheme,
    applyTheme,
    toggleTheme
  };
}); 