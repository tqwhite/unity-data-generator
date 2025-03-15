<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    show: {
        type: Boolean,
        default: false
    }
});

// Define emits for the component
const emit = defineEmits(['close', 'update:show']);

// State variables
const xmlContent = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

// Function to close the panel
const closePanel = () => {
    emit('update:show', false);
    emit('close');
};

// Computed property for display name
const displayName = computed(() => {
    return props.item?.SheetName || 'Unnamed Sheet';
});

// Function to fetch XML content
const fetchXmlContent = async () => {
    if (!props.item?.SheetName) {
        xmlContent.value = '';
        return;
    }

    const fileName = `${props.item.SheetName}.xml`;
    const filePath = `/sifUnitySampleData/${fileName}`;
    
    try {
        isLoading.value = true;
        errorMessage.value = '';
        
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        xmlContent.value = text;
    } catch (error) {
        console.error('Error loading XML file:', error);
        errorMessage.value = `Error loading XML file: ${error.message}`;
        xmlContent.value = '';
    } finally {
        isLoading.value = false;
    }
};

// Function to download the XML file
const downloadXmlFile = () => {
    if (!xmlContent.value || !props.item?.SheetName) return;
    
    const fileName = `${props.item.SheetName}.xml`;
    const blob = new Blob([xmlContent.value], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element for download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Pretty formatter for XML (adds syntax highlighting)
const prettyXml = computed(() => {
    if (!xmlContent.value) return '';
    
    // For now, we just return the raw XML
    // In a future enhancement, this could be formatted with syntax highlighting
    return xmlContent.value;
});

// Watch for changes in show state to fetch data when panel opens
watch(() => props.show, (newVal) => {
    if (newVal && props.item) {
        fetchXmlContent();
    }
}, { immediate: true });

// Watch for changes in the selected item to refresh data
watch(() => props.item?.SheetName, () => {
    if (props.show) {
        fetchXmlContent();
    }
});
</script>

<template>
    <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="80vw">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center px-4 py-2">
                <span class="text-h6">Sample Object</span>
                <v-btn icon @click="closePanel" size="small">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text v-if="item" class="pt-3 pb-2">
                <v-table density="compact" class="item-info-table">
                    <tbody>
                        <tr>
                            <td class="text-right info-label">Object Name:</td>
                            <td class="item-name">{{ displayName }}</td>
                        </tr>
                    </tbody>
                </v-table>
                
                <div v-if="isLoading" class="text-center my-4">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <div class="mt-2">Loading XML data...</div>
                </div>
                
                <div v-else-if="errorMessage" class="error-message my-4">
                    <v-alert type="error" density="compact">
                        {{ errorMessage }}
                    </v-alert>
                </div>
                
                <div v-else-if="xmlContent" class="xml-content-container mt-4">
                    <div class="xml-header d-flex align-center">
                        <span class="text-subtitle-2 font-weight-medium">XML Sample Data</span>
                        <v-spacer></v-spacer>
                        <span class="text-caption text-medium-emphasis mr-3">{{ displayName }}.xml</span>
                        <v-btn 
                            size="small"
                            icon
                            color="primary"
                            variant="text"
                            title="Download XML file"
                            @click="downloadXmlFile"
                        >
                            <v-icon>mdi-download</v-icon>
                        </v-btn>
                    </div>
                    <pre class="xml-content">{{ prettyXml }}</pre>
                </div>
                
                <div v-else class="placeholder-message mt-4">
                    No XML sample data available for this object.
                </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn
                    color="primary"
                    variant="text"
                    @click="closePanel"
                >
                    Close
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.item-info-table {
    font-size: 0.8rem !important;
    margin-bottom: 8px;
}

.item-info-table :deep(td) {
    padding: 2px 4px !important;
    height: auto !important;
    border-bottom: none !important;
}

.info-label {
    font-weight: 600;
    color: #666;
    width: 100px;
    vertical-align: top;
    padding-top: 4px !important;
}

.item-name {
    font-weight: bold;
}

.placeholder-message {
    margin-top: 20px;
    padding: 20px;
    background-color: #f5f5f5;
    border-radius: 4px;
    text-align: center;
    color: rgba(0, 0, 0, 0.6);
}

.xml-content-container {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    overflow: hidden;
}

.xml-header {
    background-color: rgba(0, 0, 0, 0.05);
    padding: 8px 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.xml-content {
    max-height: 400px;
    overflow: auto;
    padding: 12px;
    margin: 0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.8rem;
    line-height: 1.4;
    white-space: pre-wrap;
    background-color: #f8f8f8;
    color: #333;
}
</style>