<template>
  <div class="system-selection">
    <div class="text-center">
      
      <div class="selection-options mt-8">
        <v-btn
          color="primary"
          class="mb-4 smaller-button"
          :loading="isSelecting"
          :disabled="!hasItems || isSelecting"
          @click="selectRandomItem"
          prepend-icon="mdi-shuffle-variant"
          size="default"
          density="comfortable"
        >
          Roll the Dice
        </v-btn>
      </div>
      
      <!-- Selected item information is now shown in the evaluate tool -->
      
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mt-4"
        closable
      >
        {{ error }}
      </v-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Define props
const props = defineProps({
  store: {
    type: Object,
    required: true
  }
});

// Define emits
const emit = defineEmits(['select']);

const isSelecting = ref(false);
const error = ref(null);
const selectedItem = ref(null);

// Computed properties
const hasItems = computed(() => {
  return props.store.nameList && props.store.nameList.length > 0;
});

// Select a random item from the nameList
const selectRandomItem = async () => {
  error.value = null;
  isSelecting.value = true;
  
  try {
    // If name list is not loaded yet, load it
    if (!props.store.nameList.length) {
      await props.store.fetchNameList();
    }
    
    if (!props.store.nameList.length) {
      throw new Error('No items available to select');
    }
    
    // Select a random item
    const randomIndex = Math.floor(Math.random() * props.store.nameList.length);
    const randomItem = props.store.nameList[randomIndex];
    
    // Load the selected item data
    await props.store.fetchData(randomItem.refId);
    
    // Set sort preference to show CEDS matches first
    props.store.setEvaluationSortPreference('cedsMatchesConfidence', 'desc');
    
    // Update the selected item and emit
    selectedItem.value = randomItem;
    emit('select', randomItem.refId);
    
  } catch (err) {
    console.error('Error selecting random item:', err);
    error.value = err.message || 'Failed to select a random item';
  } finally {
    isSelecting.value = false;
  }
};

// Select CEDS matches function removed - may be reimplemented in the future

// Check if name list is loaded, if not load it
onMounted(async () => {
  if (!props.store.nameList.length) {
    try {
      await props.store.fetchNameList();
    } catch (err) {
      console.error('Error loading name list on mount:', err);
      error.value = 'Failed to load item list';
    }
  }
});
</script>

<style scoped>
.system-selection {
  height: 100%;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: #f5f5f5;
}

.selection-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 16px;
}

.selected-result {
  margin-top: 32px;
}

.selected-item-card {
  transition: all 0.3s ease;
}

.selected-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.smaller-button {
  transform: scale(0.75);
  transform-origin: center;
  font-size: 0.9rem;
}
</style>