<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// Props to receive the data and loading/error states
const props = defineProps({
  workingData: {
    type: [Object, Array],
    default: null
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

// Prepare data for data table
const items = ref([]);
const headers = ref([]);
const search = ref('');

// Function to extract and order headers from data items
const extractHeaders = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  
  // Collect all unique property names across all items
  const allProperties = new Set();
  data.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => allProperties.add(key));
    }
  });
  
  // Define priority order for specific columns
  const priorityOrder = ['Name', 'CEDS_ID', 'Description'];
  
  // Create sorted header array with priority columns first
  const sortedProperties = [
    // First add the priority columns in order (if they exist in the data)
    ...priorityOrder.filter(key => allProperties.has(key)),
    
    // Then add all other columns (excluding those already added)
    ...Array.from(allProperties).filter(key => !priorityOrder.includes(key))
  ];
  
  // Convert to header objects for v-data-table
  return sortedProperties.map(key => ({
    title: key,
    key: key,
    align: 'start',
    sortable: true,
    width: key === 'Description' ? '300px' : undefined, // Give Description more space
    filterable: true
  }));
};

// Process data when it changes
watch(() => props.workingData, (newData) => {
  if (newData) {
    // For array data, use directly
    if (Array.isArray(newData)) {
      items.value = newData;
    } 
    // For object data with array values (common pattern)
    else if (typeof newData === 'object') {
      // Check if this is an object of objects, each with a refId
      const firstItemList = Object.values(newData);
      if (firstItemList.length > 0 && typeof firstItemList[0] === 'object') {
        items.value = firstItemList;
      } else {
        // Fallback to wrapping the single object in an array
        items.value = [newData];
      }
    } else {
      items.value = [];
    }
    
    // Extract headers from the items
    headers.value = extractHeaders(items.value);
  } else {
    items.value = [];
    headers.value = [];
  }
}, { immediate: true });

// Computed property for filtered items
const filteredItems = computed(() => {
  if (!search.value) return items.value;
  
  const searchLower = search.value.toLowerCase();
  return items.value.filter(item => {
    return Object.values(item).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });
});
</script>

<template>
  <div class="tool-container">
    <div v-if="isLoading" class="text-center">
      <v-progress-circular indeterminate size="64" class="mb-3"></v-progress-circular>
      <div>Loading data...</div>
    </div>
    <div v-else-if="error" class="text-center text-error">
      <v-icon color="error" size="64" class="mb-3">mdi-alert-circle</v-icon>
      <div>{{ error }}</div>
    </div>
    <div v-else-if="workingData" class="w-100 h-100 overflow-auto content-container">
      <!-- Data table view -->
      <div class="pa-0">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          density="compact"
          class="mb-4"
        ></v-text-field>
        
        <v-data-table
          :headers="headers"
          :items="filteredItems"
          :search="search"
          class="spreadsheet-table"
          density="compact"
          fixed-header
          height="calc(100vh - 180px)"
          hover
        >
          <!-- Template for all cells to prevent wrapping -->
          <template v-for="header in headers" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
            <div class="no-wrap">{{ item[header.key] }}</div>
          </template>
          
          <template v-slot:bottom>
            <div class="text-center pt-2 pb-2">
              <span class="text-caption">{{ filteredItems.length }} items</span>
            </div>
          </template>
        </v-data-table>
      </div>
    </div>
    <div v-else class="text-center">
      <v-icon size="64" class="mb-3 text-medium-emphasis">mdi-table</v-icon>
      <div>Select an item from the list to view details in spreadsheet format</div>
    </div>
  </div>
</template>

<style scoped>
.tool-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
}

.content-container {
  max-width: 100%;
  width: 100%;
  overflow-x: auto;
  padding-top: 0 !important;
  margin-top: 0 !important;
}

.spreadsheet-table {
  width: 100%;
  border: 1px solid rgba(76, 175, 80, 0.2);
  table-layout: auto;
}

/* Custom styling for table headers */
:deep(.v-data-table-header th) {
  font-weight: bold;
  background-color: rgba(76, 175, 80, 0.05);
  white-space: nowrap;
  font-size: 10pt;
  padding: 2px 4px !important;
}

/* Style for the table cells */
:deep(.v-data-table-row td) {
  border-bottom: 1px solid rgba(76, 175, 80, 0.1);
  white-space: nowrap;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10pt;
  padding: 0px 4px !important;
  height: 24px !important;
  min-height: 24px !important;
}

/* Prevent text wrapping in cells */
.no-wrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0;
}

/* Override v-data-table default padding */
:deep(.v-data-table__td), 
:deep(.v-data-table__th) {
  padding: 0 4px !important;
}
</style>