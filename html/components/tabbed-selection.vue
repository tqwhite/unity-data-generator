<template>
  <v-card flat class="h-100 selection-card">
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
          @select="handleSelection"
        />
      </v-window-item>
      
      <!-- System selection tab -->
      <v-window-item value="system">
        <system-selection
          :store="store"
          @select="handleSelection"
        />
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import SelectionList from '@/components/selection-list.vue';
import SystemSelection from '@/components/system-selection.vue';

// Define props
const props = defineProps({
  store: {
    type: Object,
    required: true
  }
});

// Define emits
const emit = defineEmits(['select']);

// Active tab state - default to "Choose Element"
const activeTab = ref('manual');

// Handle selection from either component
const handleSelection = (refId) => {
  emit('select', refId);
};

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