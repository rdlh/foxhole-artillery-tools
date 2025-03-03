<template>
  <button 
    class="select-none" 
    v-bind="$attrs" 
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </button>
</template> 