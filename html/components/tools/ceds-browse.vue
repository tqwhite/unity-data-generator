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

// Search functionality
const searchQuery = ref('');
const filteredClasses = computed(() => {
  if (!searchQuery.value.trim()) {
    return ontologyClasses.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return ontologyClasses.value.filter(cls => {
    // Search in class fields
    if ((cls.name && cls.name.toLowerCase().includes(query)) ||
        (cls.label && cls.label.toLowerCase().includes(query)) ||
        (cls.definition && cls.definition.toLowerCase().includes(query)) ||
        (cls.description && cls.description.toLowerCase().includes(query))) {
      return true;
    }
    
    // Search in properties
    if (cls.properties) {
      return cls.properties.some(prop => 
        (prop.name && prop.name.toLowerCase().includes(query)) ||
        (prop.label && prop.label.toLowerCase().includes(query)) ||
        (prop.definition && prop.definition.toLowerCase().includes(query)) ||
        (prop.description && prop.description.toLowerCase().includes(query))
      );
    }
    
    return false;
  });
});

// Track expanded panels
const expandedClasses = ref([]);

// Toggle expand all/collapse all
const expandAll = () => {
  expandedClasses.value = filteredClasses.value.map(cls => cls.refId);
};

const collapseAll = () => {
  expandedClasses.value = [];
};

// No longer need manual toggle function since v-expansion-panels handles it
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
        <v-card-title class="text-h6 d-flex align-center">
          <div>
            CEDS Ontology Classes
            <v-chip class="ml-2" color="primary" size="small">{{ ontologyClasses.length }} classes</v-chip>
          </div>
          <v-spacer></v-spacer>
          <v-btn 
            variant="text" 
            size="small" 
            prepend-icon="mdi-arrow-expand-all" 
            @click="expandAll"
            class="mx-1"
          >
            Expand All
          </v-btn>
          <v-btn 
            variant="text" 
            size="small" 
            prepend-icon="mdi-arrow-collapse-all" 
            @click="collapseAll"
            class="mx-1"
          >
            Collapse All
          </v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            label="Search CEDS Ontology"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-4"
          ></v-text-field>
          
          <div v-if="!filteredClasses.length" class="text-center py-4">
            <p class="text-body-1 text-grey-darken-1">No classes match your search query.</p>
          </div>
          
          <v-expansion-panels
            v-model="expandedClasses"
            multiple
            variant="accordion"
          >
            <v-expansion-panel
              v-for="cls in filteredClasses"
              :key="cls.refId"
              :value="cls.refId"
              :class="{ 'has-properties': cls.properties && cls.properties.length }"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <div class="class-title">
                    <strong>{{ cls.name || cls.label || 'Unnamed Class' }} {{ cls.notation }}</strong>
                  </div>
                  <v-chip v-if="cls.properties && cls.properties.length" class="ml-2" size="x-small" color="primary">
                    {{ cls.properties.length }} {{ cls.properties.length === 1 ? 'property' : 'properties' }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              
              <v-expansion-panel-text>
                <div class="metadata-section mb-4">
                  <div class="metadata-item">
                    <div class="metadata-label">Definition:</div>
                    <div class="metadata-value">{{ cls.definition || cls.description || cls.comment || cls.label || 'No definition available' }}</div>
                  </div>
                  <div class="metadata-item" v-if="cls.prefLabel">
                    <div class="metadata-label">Preferred Label:</div>
                    <div class="metadata-value">{{ cls.prefLabel }}</div>
                  </div>
                  <div class="metadata-item" v-if="cls.notation">
                    <div class="metadata-label">Notation:</div>
                    <div class="metadata-value metadata-code">{{ cls.notation }}</div>
                  </div>
                  <div class="metadata-item" v-if="cls.uri">
                    <div class="metadata-label">URI:</div>
                    <div class="metadata-value metadata-uri">{{ cls.uri }}</div>
                  </div>
                  <div class="metadata-item" v-if="cls.classType">
                    <div class="metadata-label">Class Type:</div>
                    <div class="metadata-value">{{ cls.classType }}</div>
                  </div>
                </div>
                
                <!-- Properties Section -->
                <div v-if="cls.properties && cls.properties.length" class="properties-section">
                  <h3 class="text-subtitle-2 mb-2">Properties</h3>
                  
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel
                      v-for="prop in cls.properties"
                      :key="prop.refId"
                      class="property-panel"
                    >
                      <v-expansion-panel-title>
                        <div class="property-title">
                          <v-icon icon="mdi-function-variant" size="small" class="mr-2"></v-icon>
                          <strong>{{ prop.name || prop.label || 'Unnamed Property' }}</strong>
                          <v-chip v-if="prop.propertyType" class="ml-2" size="x-small" color="info">
                            {{ prop.propertyType }}
                          </v-chip>
                        </div>
                      </v-expansion-panel-title>
                      
                      <v-expansion-panel-text>
                        <div class="metadata-section">
                          <div class="metadata-item">
                            <div class="metadata-label">Definition:</div>
                            <div class="metadata-value">{{ prop.definition || prop.description || prop.comment || prop.label || 'No definition available' }}</div>
                          </div>
                          <div class="metadata-item" v-if="prop.prefLabel">
                            <div class="metadata-label">Preferred Label:</div>
                            <div class="metadata-value">{{ prop.prefLabel }}</div>
                          </div>
                          <div class="metadata-item" v-if="prop.notation">
                            <div class="metadata-label">Notation:</div>
                            <div class="metadata-value metadata-code">{{ prop.notation }}</div>
                          </div>
                          <div class="metadata-item" v-if="prop.uri">
                            <div class="metadata-label">URI:</div>
                            <div class="metadata-value metadata-uri">{{ prop.uri }}</div>
                          </div>
                          <div class="metadata-item" v-if="prop.propertyType">
                            <div class="metadata-label">Property Type:</div>
                            <div class="metadata-value">{{ prop.propertyType }}</div>
                          </div>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>
                
                <div v-else class="no-properties-message">
                  <v-icon icon="mdi-alert-circle-outline" color="warning"></v-icon>
                  <span class="ml-2">This class has no properties</span>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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

/* Metadata section styling */
.metadata-section {
  margin-top: 4px;
  margin-bottom: 12px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 3px solid rgba(0, 0, 0, 0.1);
}

.metadata-item {
  display: flex;
  margin-bottom: 6px;
}

.metadata-label {
  font-weight: 500;
  color: #555;
  min-width: 120px;
  margin-right: 10px;
  text-align: right;
}

.metadata-value {
  color: #333;
  flex: 1;
  line-height: 1.4;
}

.metadata-code {
  font-family: monospace;
  color: #0d47a1;
  font-size: 0.9em;
}

.metadata-uri {
  font-family: monospace;
  font-size: 0.9em;
  color: #006064;
  word-break: break-all;
}

.properties-section {
  margin-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 16px;
}

.property-panel {
  margin-bottom: 4px;
}

.property-title {
  display: flex;
  align-items: center;
}

.no-properties-message {
  display: flex;
  align-items: center;
  color: #999;
  font-style: italic;
  padding: 12px 0;
}

/* Styling for panels with properties */
.has-properties :deep(.v-expansion-panel-title) {
  background-color: rgba(0, 0, 0, 0.02);
}

/* Make expansion panel titles more clickable */
:deep(.v-expansion-panel-title) {
  cursor: pointer;
}

:deep(.v-expansion-panel-title:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Class title with code styling */
.class-title {
  display: flex;
  align-items: center;
}

.class-code {
  font-family: monospace;
  font-weight: 500;
  color: #0d47a1;
  margin-right: 8px;
  background: rgba(13, 71, 161, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}
</style>