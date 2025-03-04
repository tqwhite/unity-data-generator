<script setup>
import { ref, computed, onMounted } from 'vue';

// Props to receive the store and handle selection
const props = defineProps({
  store: {
    type: Object,
    required: true
  }
});

// Emit events for parent components
const emit = defineEmits(['select']);

const selectedRefId = ref(null);
const filterText = ref('');

// Filtered nameList based on filter text
const filteredNameList = computed(() => {
  if (!filterText.value || !props.store.nameList) return props.store.nameList;
  
  const query = filterText.value.toLowerCase();
  return props.store.nameList.filter(item => 
    item.name?.toLowerCase().includes(query) || 
    item.refId?.toLowerCase().includes(query)
  );
});

// Load name list on component mount
onMounted(async () => {
  if (!props.store.hasNameList) {
    await props.store.fetchNameList();
  }
});

// Handler for item selection
const selectItem = async (refId) => {
  selectedRefId.value = refId;
  await props.store.fetchData(refId);
  emit('select', refId); // Emit the selected ID to parent
};
</script>

<template>
  <v-card flat class="h-100 selection-card">
    <v-card-title class="text-h6 py-3 px-4">LIST</v-card-title>
    
    <!-- Filter Tool -->
    <v-text-field
      v-model="filterText"
      label="Filter Tool"
      prepend-inner-icon="mdi-filter-outline"
      variant="outlined"
      density="compact"
      hide-details
      class="mx-3 mb-3 filter-field"
      placeholder="Filter items by text"
    ></v-text-field>
    
    <!-- Selector list -->
    <v-list class="overflow-y-auto selector-list" density="compact">
      <v-list-item
        v-for="item in filteredNameList"
        :key="item.refId"
        :active="selectedRefId === item.refId"
        @click="selectItem(item.refId)"
        density="compact"
        class="py-1"
      >
        <v-list-item-title class="text-body-2 text-truncate">{{ item.name || item.refId }}</v-list-item-title>
      </v-list-item>
      
      <v-list-item v-if="props.store.isLoading" density="compact">
        <v-list-item-title class="text-body-2">
          <v-progress-circular indeterminate size="16" class="mr-2"></v-progress-circular>
          Loading...
        </v-list-item-title>
      </v-list-item>
      
      <v-list-item v-else-if="filteredNameList.length === 0" density="compact">
        <v-list-item-title class="text-body-2 text-medium-emphasis">
          No items found
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<style scoped>
.h-100 {
  height: 100%;
}
.selection-card {
  width: 100%;
  max-width: 300px;
}
.filter-field {
  width: 100%;
  max-width: 300px;
}
.selector-list {
  max-height: calc(100vh - 200px);
  width: 100%;
  max-width: 300px;
}

/* Reduce spacing between list items */
:deep(.v-list-item__content) {
  padding: 4px 0;
}

/* Make active items stand out with background color */
:deep(.v-list-item--active) {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>