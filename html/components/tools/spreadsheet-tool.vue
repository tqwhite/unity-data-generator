<script setup>
import { ref, computed, onMounted } from 'vue';

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
const tableItems = ref([]);
const tableHeaders = ref([]);
const search = ref('');

// Debug helper to log actual properties
const logDataStructure = () => {
  if (!props.workingData) return;
  
  // Get the flat array of items
  let items = [];
  if (Array.isArray(props.workingData)) {
    items = props.workingData;
  } else if (typeof props.workingData === 'object') {
    items = Object.values(props.workingData);
  }
  
  if (items.length === 0) return;
  
  console.log('First data item properties:', Object.keys(items[0]));
  console.log('Sample data item:', items[0]);
};

// Initialize the table data
const initializeTable = () => {
  if (!props.workingData) {
    tableItems.value = [];
    tableHeaders.value = [];
    return;
  }
  
  // Convert data to array format
  if (Array.isArray(props.workingData)) {
    tableItems.value = props.workingData;
  } else if (typeof props.workingData === 'object') {
    tableItems.value = Object.values(props.workingData);
  } else {
    tableItems.value = [];
    return;
  }
  
  if (tableItems.value.length === 0) return;
  
  // Get all unique properties across all items
  const allProperties = new Set();
  tableItems.value.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => allProperties.add(key));
    }
  });
  
  // Define the priority columns
  const priorityKeys = ['Name', 'CEDS ID', 'Description'];
  
  // Create headers with priority columns first
  const headers = [];
  
  // Add priority columns first
  priorityKeys.forEach(key => {
    if (allProperties.has(key)) {
      headers.push({
        title: key,
        key: key,
        align: 'start',
        sortable: true
      });
      allProperties.delete(key);
    }
  });
  
  // Add remaining columns
  Array.from(allProperties).forEach(key => {
    headers.push({
      title: key,
      key: key,
      align: 'start',
      sortable: true
    });
  });
  
  tableHeaders.value = headers;
};

// Filtered items based on search
const filteredItems = computed(() => {
  if (!search.value) return tableItems.value;
  
  const searchLower = search.value.toLowerCase();
  return tableItems.value.filter(item => {
    return Object.values(item).some(value => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });
});

// Initialize on mount and when workingData changes
onMounted(() => {
  logDataStructure();
  initializeTable();
});

// Watch for changes in workingData
watch(() => props.workingData, () => {
  logDataStructure();
  initializeTable();
}, { immediate: true });
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
    <div v-else-if="workingData" class="w-100 h-100 content-container">
      <!-- Basic search field -->
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
        
        <!-- Data table with horizontal scroll -->
        <div class="table-container">
          <v-data-table
            :headers="tableHeaders"
            :items="filteredItems"
            class="spreadsheet-table"
            density="compact"
            fixed-header
            height="calc(100vh - 180px)"
            :items-per-page="-1"
            hide-default-footer
          >
            <!-- Template for cells to prevent wrapping -->
            <template v-for="header in tableHeaders" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
              <div class="no-wrap">{{ item[header.key] }}</div>
            </template>
          </v-data-table>
        </div>
        
        <div class="text-center pt-2">
          <span class="text-caption">{{ tableItems.length }} items</span>
        </div>
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

/* Force cells not to wrap */
:deep(.v-data-table) {
  white-space: nowrap !important;
}

:deep(.v-data-table__wrapper) {
  overflow-x: auto;
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
  white-space: nowrap !important;
  max-width: 800px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10pt;
  padding: 0px 4px !important;
  height: 24px !important;
  min-height: 24px !important;
}

/* Override v-data-table default padding */
:deep(.v-data-table__td), 
:deep(.v-data-table__th) {
  padding: 0 4px !important;
}

.no-wrap {
  white-space: nowrap !important;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0;
}

.table-container {
  overflow-x: auto;
  width: 100%;
}
</style>