<script setup>
import { ref, computed } from 'vue';
import { useCedsStore } from '@/stores/cedsStore';
import SemanticDistanceGrid from '../tools/editors/lib/semanticDistanceGrid.vue';

// Initialize the store
const cedsStore = useCedsStore();

// Props definition
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

// Search query input
const searchQuery = ref("");
const searchId = ref("ceds-search-" + Date.now());

// Function to fetch custom query
const fetchCustomQuery = async () => {
  if (!searchQuery.value.trim()) return;
  
  const queryString = searchQuery.value.trim();
  console.log(`Fetching semantic distance data for query: "${queryString}"`);
  
  await cedsStore.fetchSemanticDistance(searchId.value, queryString);
  
  // Clear the input box after fetching results
  searchQuery.value = "";
};

// Get semantic distance results
const searchResults = computed(() => {
  return cedsStore.getSemanticDistanceResults(searchId.value);
});
</script>

<template>
  <div class="ceds-search-container">
    <h2 class="text-h4 mb-4">CEDS Semantic Distance Search Tool</h2>
    
    <div v-if="isLoading" class="loading-indicator">
      Loading data...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="content-area">
      <!-- Query input for semantic distance -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-text-field
            v-model="searchQuery"
            label="Search CEDS Terms"
            hint="Enter phrase to find matching CEDS ideas using semantic distance search"
            persistent-hint
            variant="outlined"
            :append-inner-icon="searchQuery.trim() ? 'mdi-magnify-plus' : 'mdi-magnify'"
            :append-inner-icon-color="searchQuery.trim() ? 'primary' : undefined"
            @click:append-inner="fetchCustomQuery"
            @keyup.enter="fetchCustomQuery"
          ></v-text-field>
        </v-col>
      </v-row>
      
      <!-- Loading indicator during search -->
      <div v-if="cedsStore.isLoadingSemanticDistance" class="loading-indicator py-4">
        <v-progress-linear
          indeterminate
          color="primary"
        ></v-progress-linear>
        <div class="text-center mt-2">Searching for semantically similar CEDS terms...</div>
      </div>
      
      <!-- Semantic distance results - displayed in reverse order (newest first) -->
      <div v-if="searchResults.length > 0">
        <div v-for="(resultData, index) in [...searchResults].reverse()" :key="index" class="mt-3">
          <SemanticDistanceGrid
            :sourceText="resultData.queryString"
            :originalText="resultData.originalQuery"
            :results="resultData.resultSet"
            :error="cedsStore.semanticDistanceError"
          />
        </div>
      </div>
      
      <!-- Empty state - no searches yet -->
      <div v-else-if="!cedsStore.isLoadingSemanticDistance && searchQuery.trim() === ''" class="empty-state">
        <v-icon icon="mdi-database-search" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h6 text-grey-darken-1">Search for CEDS Terms</h3>
        <p class="text-body-1 text-grey-darken-1">
          Enter keywords above to find semantically related CEDS terms.
        </p>
      </div>
      
      <!-- No results found -->
      <div v-else-if="!cedsStore.isLoadingSemanticDistance && searchQuery.trim() !== '' && searchResults.length === 0" class="no-results">
        <v-icon icon="mdi-magnify-close" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <h3 class="text-h6 text-grey-darken-1">No Results Found</h3>
        <p class="text-body-1 text-grey-darken-1">
          Try different keywords or phrases to find CEDS terms.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ceds-search-container {
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

.empty-state, .no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8px;
}
</style>