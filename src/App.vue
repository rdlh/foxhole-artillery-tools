<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useLanguageStore } from './stores/languageStore'
import ArtilleryCalculator from './components/ArtilleryCalculator.vue'

const languageStore = useLanguageStore()

// Update document title and meta description based on current language
const updateDocumentMetadata = () => {
  // Update the document title
  document.title = languageStore.t('appTitle')
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]')
  if (!metaDescription) {
    metaDescription = document.createElement('meta')
    metaDescription.setAttribute('name', 'description')
    document.head.appendChild(metaDescription)
  }
  metaDescription.setAttribute('content', languageStore.t('appDescription'))
}

// Update metadata on component mount
onMounted(() => {
  // Initialize language
  languageStore.initLanguage()
  
  // Update metadata
  updateDocumentMetadata()
})

// Watch for language changes and update metadata
watch(() => languageStore.currentLanguage, () => {
  updateDocumentMetadata()
})
</script>

<template>
  <div class="min-h-screen bg-gray-200 dark:bg-gray-900 py-8 px-4">
    <div class="container mx-auto">
      <ArtilleryCalculator />
      <div class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {{ languageStore.t('appDescription') }}
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
