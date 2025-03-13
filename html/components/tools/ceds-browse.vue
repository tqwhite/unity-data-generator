<script setup>
import { ref, onMounted, computed } from 'vue';
import { useCedsStore } from '@/stores/cedsStore';

const cedsStore = useCedsStore();

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

// Fetch the ontology classes data when the component is mounted
onMounted(async () => {
  if (!cedsStore.hasOntologyClasses) {
    await cedsStore.fetchOntologyClasses();
  }
});

// Computed property to get the ontology data
const ontologyClasses = computed(() => cedsStore.ontologyClasses || []);

// Show raw JSON for now - this will be replaced with a proper UI later
</script>

<template>
  <div class="ceds-browse-container">
    <h2 class="text-h4 mb-4">CEDS Ontology Browser</h2>
    
    <div v-if="cedsStore.isLoadingOntologyClasses || isLoading" class="loading-indicator">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
      <div class="mt-3">Loading CEDS ontology data...</div>
    </div>
    
    <div v-else-if="cedsStore.ontologyClassesError || error" class="error-message">
      {{ cedsStore.ontologyClassesError || error }}
    </div>
    
    <div v-else-if="!ontologyClasses.length" class="empty-state">
      <v-icon icon="mdi-database-off" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
      <h3 class="text-h6 text-grey-darken-1">No Ontology Data Available</h3>
      <p class="text-body-1 text-grey-darken-1">
        The CEDS ontology data is empty or could not be loaded.
      </p>
    </div>
    
    <div v-else class="content-area">
      <v-card>
        <v-card-title class="text-h6">
          CEDS Ontology Classes
          <v-chip class="ml-2" color="primary" size="small">{{ ontologyClasses.length }} classes</v-chip>
        </v-card-title>
        <v-card-text>
          <pre class="json-display">{{ JSON.stringify(ontologyClasses, null, 2) }}</pre>
        </v-card-text>
      </v-card>
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
  padding: 64px;
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.json-display {
  max-height: 600px;
  overflow-y: auto;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>