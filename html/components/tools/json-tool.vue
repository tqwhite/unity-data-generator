<script setup>
// Props to receive the data and loading/error states
const props = defineProps({
  workingData: {
    type: [Object, Array],
    default: null
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
  <div class="tool-container">
    <div v-if="isLoading" class="text-center">
      <v-progress-circular indeterminate size="64" class="mb-3"></v-progress-circular>
      <div>Loading data...</div>
    </div>
    <div v-else-if="error" class="text-center text-error">
      <v-icon color="error" size="64" class="mb-3">mdi-alert-circle</v-icon>
      <div>{{ error }}</div>
    </div>
    <div v-else-if="workingData" class="w-100 h-100 overflow-auto content-container">
      <!-- Data will be displayed here -->
      <pre class="data-display">{{ JSON.stringify(workingData, null, 2) }}</pre>
    </div>
    <div v-else class="text-center">
      <v-icon size="64" class="mb-3 text-medium-emphasis">mdi-database-search</v-icon>
      <div>Select an item from the list to view details</div>
    </div>
  </div>
</template>

<style scoped>
.tool-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.data-display {
  text-align: left;
  width: 100%;
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #2196F3; /* Blue color for JSON */
}

.content-container {
  max-width: 100%;
  overflow-x: hidden;
}
</style>