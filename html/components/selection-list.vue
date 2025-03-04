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
  <v-card flat class="h-100">
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
    <v-list class="overflow-y-auto selector-list">
      <v-list-item
        v-for="item in filteredNameList"
        :key="item.refId"
        :active="selectedRefId === item.refId"
        @click="selectItem(item.refId)"
      >
        <v-list-item-title>{{ item.name || item.refId }}</v-list-item-title>
      </v-list-item>
      
      <v-list-item v-if="props.store.isLoading">
        <v-list-item-title>
          <v-progress-circular indeterminate size="20" class="mr-2"></v-progress-circular>
          Loading...
        </v-list-item-title>
      </v-list-item>
      
      <v-list-item v-else-if="filteredNameList.length === 0">
        <v-list-item-title class="text-subtitle-2 text-medium-emphasis">
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
.filter-field {
  width: 20vw;
}
.selector-list {
  max-height: calc(100vh - 200px);
  width: 20vw;
}
</style>