<template>
  <v-menu v-model="showMenu" :close-on-content-click="false" offset-y>
    <template v-slot:activator="{ props }">
      <v-btn
        class="mr-2"
        variant="outlined"
        color="primary"
        v-bind="props"
        prepend-icon="mdi-brain"
        size="small"
      >
        {{ currentModeDisplay }}
        <v-icon class="ml-1" size="small">mdi-chevron-down</v-icon>
      </v-btn>
    </template>

    <v-card min-width="320" max-width="400">
      <v-card-title class="text-h6 pb-2 d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-brain</v-icon>
        Semantic Analysis Mode
      </v-card-title>
      
      <v-card-text>
        <v-radio-group 
          v-model="localSelectedMode" 
          @update:modelValue="handleModeChange"
        >
          <v-radio 
            value="simpleVector" 
            class="mb-3"
          >
            <template v-slot:label>
              <div>
                <div class="font-weight-medium text-body-1">Simple Vector</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Fast direct embedding matching. Best for general semantic search.
                </div>
              </div>
            </template>
          </v-radio>
          
          <v-radio 
            value="atomicVector"
            class="mb-3"
          >
            <template v-slot:label>
              <div>
                <div class="font-weight-medium text-body-1">Atomic Vector</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  AI-powered fact decomposition. More precise for complex educational standards.
                </div>
              </div>
            </template>
          </v-radio>
          
          <!-- Future modes can be added here -->
        </v-radio-group>
        
        <!-- Version selector - shown when mode has multiple versions -->
        <v-select
          v-if="modeVersionConfigs[localSelectedMode]?.versions?.length > 1"
          v-model="localSelectedVersion"
          :items="modeVersionConfigs[localSelectedMode].versions"
          label="Analyzer Version"
          density="compact"
          variant="outlined"
          class="mt-4"
          @update:modelValue="handleVersionChange"
        ></v-select>
        
        <v-alert 
          v-if="localSelectedMode === 'atomicVector'" 
          type="info" 
          variant="tonal" 
          density="compact"
          class="mt-3"
        >
          <template v-slot:prepend>
            <v-icon icon="mdi-information"></v-icon>
          </template>
          Atomic mode provides richer analysis but may take longer to process.
        </v-alert>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          variant="text" 
          @click="showMenu = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  selectedMode: {
    type: String,
    default: 'simpleVector'
  },
  selectedVersion: {
    type: String,
    default: 'simple_version1'  // Default version for simpleVector mode
  }
});

const emit = defineEmits(['update:selection']);

const showMenu = ref(false);
const localSelectedMode = ref(props.selectedMode);
const localSelectedVersion = ref(props.selectedVersion);

// Version configurations for each mode
const modeVersionConfigs = {
  simpleVector: {
    versions: [
      { title: 'Version 1', value: 'simple_version1' }
    ],
    default: 'simple_version1'
  },
  atomicVector: {
    versions: [
      { title: 'Version 2 (Education Domain Categories)', value: 'atomic_version2' },
      { title: 'Version 1 (Grammar Based Deconstruction)', value: 'atomic_version1' }
    ],
    default: 'atomic_version2'
  }
};

// Store the last selected version for each mode
const modeVersionMemory = ref({
  simpleVector: 'simple_version1',
  atomicVector: 'atomic_version2'
});

// Display names for modes
const modeDisplayNames = {
  simpleVector: 'Simple Vector',
  atomicVector: 'Atomic Vector'
};

const currentModeDisplay = computed(() => {
  const modeText = modeDisplayNames[props.selectedMode] || 'Unknown Mode';
  // Add version info for atomic mode
  if (props.selectedMode === 'atomicVector') {
    const versionMap = {
      'atomic_version1': 'v1',
      'atomic_version2': 'v2'
    };
    const versionText = versionMap[props.selectedVersion] || 'v?';
    return `${modeText} (${versionText})`;
  }
  return modeText;
});

// Handle mode changes
const handleModeChange = (newMode) => {
  // Get the appropriate version for the new mode
  // First check if we have a stored version for this mode, otherwise use default
  const config = modeVersionConfigs[newMode];
  const semanticAnalyzerVersion = modeVersionMemory.value[newMode] || config.default;
  
  // Update the local selected version
  localSelectedVersion.value = semanticAnalyzerVersion;
  
  emit('update:selection', {
    semanticAnalysisMode: newMode,
    semanticAnalyzerVersion: semanticAnalyzerVersion
  });
  // Keep menu open so user can see the info alert if atomic mode is selected
};

// Handle version changes
const handleVersionChange = (newVersion) => {
  localSelectedVersion.value = newVersion;
  // Remember this version for this mode
  modeVersionMemory.value[localSelectedMode.value] = newVersion;
  
  emit('update:selection', {
    semanticAnalysisMode: localSelectedMode.value,
    semanticAnalyzerVersion: newVersion
  });
};

// Watch for external changes to selectedMode
watch(() => props.selectedMode, (newMode) => {
  localSelectedMode.value = newMode;
});

// Watch for external changes to selectedVersion
watch(() => props.selectedVersion, (newVersion) => {
  localSelectedVersion.value = newVersion;
});
</script>

<style scoped>
/* Custom styling for radio button labels */
:deep(.v-selection-control__wrapper) {
  margin-right: 8px;
}

:deep(.v-radio .v-label) {
  opacity: 1;
}
</style>