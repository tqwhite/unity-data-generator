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
  }
});

const emit = defineEmits(['update:selectedMode']);

const showMenu = ref(false);
const localSelectedMode = ref(props.selectedMode);

// Display names for modes
const modeDisplayNames = {
  simpleVector: 'Simple Vector',
  atomicVector: 'Atomic Vector'
};

const currentModeDisplay = computed(() => {
  return modeDisplayNames[props.selectedMode] || 'Unknown Mode';
});

// Handle mode changes
const handleModeChange = (newMode) => {
  emit('update:selectedMode', newMode);
  // Keep menu open so user can see the info alert if atomic mode is selected
};

// Watch for external changes to selectedMode
watch(() => props.selectedMode, (newMode) => {
  localSelectedMode.value = newMode;
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