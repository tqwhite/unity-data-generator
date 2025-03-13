<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  workingData: {
    type: [Array, Object],
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div class="ceds-browse-container">
    <h2>CEDS Browse Tool</h2>
    <p>Hello World! This is the CEDS Browse component.</p>
    
    <div v-if="isLoading" class="loading-indicator">
      Loading data...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="content-area">
      <p>Ready to implement browse functionality for CEDS data.</p>
    </div>
  </div>
</template>

<style scoped>
.ceds-browse-container {
  width: 100%;
  padding: 16px;
}

.loading-indicator {
  text-align: center;
  padding: 24px;
  font-style: italic;
  color: #777;
}

.error-message {
  background-color: #ffecec;
  border: 1px solid #f5aca6;
  border-radius: 4px;
  padding: 12px;
  margin: 12px 0;
  color: #cc0000;
}

.content-area {
  margin-top: 24px;
}
</style>