<template>
  <v-card flat class="h-100 selection-card">
    <!-- Semantic Analysis Mode Selector -->
    <div class="semantic-mode-container pa-3">
      <SemanticAnalysisModeSelector 
        :selectedMode="semanticAnalysisMode"
        :selectedVersion="semanticAnalyzerVersion"
        @update:selection="handleSelectionChange"
      />
    </div>
    
    <v-divider></v-divider>
    
    <!-- Tabs for switching between manual and system selection -->
    <v-tabs 
      v-model="activeTab" 
      bg-color="background" 
      class="tab-container"
      show-arrows
    >
      <v-tab 
        value="manual" 
        class="text-caption tab-button"
        rounded="t"
      >
        Choose Element
      </v-tab>
      <v-tab 
        value="system" 
        class="text-caption tab-button"
        rounded="t"
      >
        You Choose For Me
      </v-tab>
    </v-tabs>
    
    <v-divider class="selection-divider"></v-divider>
    
    <v-window v-model="activeTab" class="h-100">
      <!-- Manual selection tab -->
      <v-window-item value="manual">
        <selection-list 
          :store="store" 
          :selectItem="selectItem"
          @select="handleSelection"
        />
      </v-window-item>
      
      <!-- System selection tab -->
      <v-window-item value="system">
        <roll-the-dice
          :store="store"
          :selectItem="selectItem"
          @select="handleSelection"
        />
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import SelectionList from '@/components/selection-list.vue';
import SystemSelection from '@/components/roll-the-dice.vue';
import SemanticAnalysisModeSelector from '@/components/tools/semantic-analysis-mode-selector.vue';

// Define props
const props = defineProps({
  store: {
    type: Object,
    required: true
  },
  initialTab: {
    type: String,
    default: 'system' // Default to "You Choose For Me" tab
  }
});

// Define emits
const emit = defineEmits(['select', 'tabChange']);

// Active tab state - initially set from props or default to "Choose Element"
const activeTab = ref(props.initialTab);

// Semantic analysis mode state
const semanticAnalysisMode = ref('atomicVector');
const semanticAnalyzerVersion = ref('atomic_version2');  // Default version for atomicVector mode
const currentlySelectedRefId = ref(null);

// Centralized selectItem function - replaces individual implementations in child components
const selectItem = async (refId) => {
  console.log('selectItem called with refId:', refId, 'mode:', semanticAnalysisMode.value, 'version:', semanticAnalyzerVersion.value);
  currentlySelectedRefId.value = refId;
  await props.store.fetchData(refId, { 
    semanticAnalysisMode: semanticAnalysisMode.value,
    semanticAnalyzerVersion: semanticAnalyzerVersion.value 
  });
  emit('select', refId);
};

// Handle semantic analysis selection changes (both mode and version)
const handleSelectionChange = async (selection) => {
  console.log('handleSelectionChange called with:', selection, 'currently selected:', currentlySelectedRefId.value);
  semanticAnalysisMode.value = selection.semanticAnalysisMode;
  semanticAnalyzerVersion.value = selection.semanticAnalyzerVersion;
  // If an item is currently selected, refresh it with the new selection
  if (currentlySelectedRefId.value) {
    console.log('Refreshing item with new selection:', selection);
    await selectItem(currentlySelectedRefId.value);
  } else {
    console.log('No item currently selected - selection change will apply to next selection');
  }
};

// Handle selection from either component
const handleSelection = (refId) => {
  emit('select', refId);
};

// Watch for tab changes and emit an event
watch(activeTab, (newTabValue) => {
  emit('tabChange', newTabValue);
});

// Watch for changes in the initialTab prop
watch(() => props.initialTab, (newTabValue) => {
  activeTab.value = newTabValue;
});

// Watch for changes in semantic analysis mode and version
watch([semanticAnalysisMode, semanticAnalyzerVersion], ([newMode, newVersion], [oldMode, oldVersion]) => {
  console.log('Semantic analysis changed from', oldMode, '/', oldVersion, 'to', newMode, '/', newVersion);
});

onMounted(() => {
  // Initialize
});
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.selection-card {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

/* For v-window to take remaining height */
:deep(.v-window) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

:deep(.v-window__container) {
  flex-grow: 1;
}

:deep(.v-window-item) {
  height: 100%;
}

:deep(.v-window-item--active) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tab styling */
.tab-container {
  border-bottom: none;
}

:deep(.v-tab) {
  min-width: 110px;
  border: 1px solid #bdbdbd; /* Darker border color */
  border-bottom: none;
  margin-right: 2px;
  margin-bottom: -1px;
  z-index: 1;
  transition: all 0.2s ease; /* Smooth transition */
}

:deep(.v-tab--selected) {
  background-color: #e3f2fd; /* Light blue background */
  border-bottom: 1px solid #e3f2fd;
  font-weight: bold;
  color: #1976d2 !important; /* Ensure text is blue */
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05); /* Subtle shadow at top */
}

.selection-divider {
  border-width: 1px;
  margin-top: 0;
  border-color: #bdbdbd !important; /* Match the tab border color */
}
</style>