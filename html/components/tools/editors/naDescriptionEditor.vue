<script setup>
import { ref, watch, computed } from 'vue';
import { useNamodelStore } from '@/stores/namodelStore';
import { useCedsStore } from '@/stores/cedsStore';
import SemanticDistanceGrid from './lib/semanticDistanceGrid.vue';

// Initialize the stores
const namodelStore = useNamodelStore();
const cedsStore = useCedsStore();

// Custom query input
const customQuery = ref("");

// CEDS data for the item (if it has a CEDS ID)
const cedsData = ref(null);
const isLoadingCedsData = ref(false);

// Define props for the editor component
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

// Define emits for the editor component
const emit = defineEmits(['close', 'update:show']);

// Function to close the editor
const closeEditor = () => {
    emit('update:show', false);
    emit('close');
};

// Function to fetch CEDS data if the item has a CEDS ID
const fetchCedsData = async () => {
    if (props.item && props.item['CEDS ID']) {
        isLoadingCedsData.value = true;
        cedsData.value = null;
        
        try {
            // Fetch CEDS data using the ID
            await cedsStore.fetchData(props.item['CEDS ID']);
            
            // Find the specific CEDS object in the response
            if (cedsStore.combinedObject) {
                // Extract the CEDS object that matches the ID
                const cedsId = props.item['CEDS ID'];
                
                // Check if the object exists in the combinedObject
                if (cedsStore.combinedObject) {
                    cedsData.value = cedsStore.combinedObject;
                } else {
                    // Search through the list of properties
                    const foundItem = cedsStore.listOfProperties?.find(
                        item => item.GlobalID === cedsId || item.refId === cedsId
                    );
                    if (foundItem) {
                        cedsData.value = foundItem;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching CEDS data:', error);
        } finally {
            isLoadingCedsData.value = false;
        }
    }
};

// Watch for show changes to handle visibility and fetch data
watch(() => props.show, (newVal) => {
    if (newVal) {
        if (props.item?.Description) {
            // Fetch semantic results when editor opens
            fetchSemanticResults();
        }
        
        if (props.item && props.item['CEDS ID']) {
            // Fetch CEDS data if the item has a CEDS ID
            fetchCedsData();
        }
    }
});

// Function to fetch semantic results
const fetchSemanticResults = async () => {
    // Fetch results using the Description field and XPath
    if (!namodelStore.isLoadingSemanticDistance && props.item) {
        // The XPath preprocessing is now handled in the fetchSemanticDistance function
        const queryString = `${props.item.Description} ${props.item.XPath}`;
        console.log(`Fetching semantic distance data for: "${queryString}"`);
        // Use the refId as the identifier for this query
        const refId = props.item.refId || props.item.XPath || "default";
        await namodelStore.fetchSemanticDistance(refId, queryString);
    }
};

// Get semantic distance results for the current item
const currentItemResults = computed(() => {
    if (!props.item) return [];
    const refId = props.item.refId || props.item.XPath || "default";
    return namodelStore.getSemanticDistanceResults(refId);
});

// Function to fetch custom query
const fetchCustomQuery = async () => {
    if (!customQuery.value.trim() || !props.item) return;
    
    const queryString = customQuery.value.trim();
    console.log(`Fetching semantic distance data for custom query: "${queryString}"`);
    
    // Use the refId as the identifier for this query
    const refId = props.item.refId || props.item.XPath || "default";
    await namodelStore.fetchSemanticDistance(refId, queryString);
    
    // Clear the input field after fetching
    customQuery.value = "";
};

// No longer need to process distances here as it's handled in the SemanticDistanceGrid component
</script>

<template>
    <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="80vw">
        <v-card>
            <v-card-title class="d-flex justify-end py-1 px-2">
                <v-btn icon @click="closeEditor" size="small">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-text v-if="item" class="pt-0 pb-2">
                <v-table density="compact" class="item-info-table">
                    <tbody>
                        <tr>
                            <td class="text-right info-label">Name:</td>
                            <td class="item-name">{{ item.Name }}</td>
                        </tr>
                        <tr>
                            <td class="text-right info-label">Description:</td>
                            <td class="item-description">{{ item.Description }}</td>
                        </tr>
                        <tr v-if="item.XPath">
                            <td class="text-right info-label">XPath:</td>
                            <td class="item-xpath">{{ item.XPath }}</td>
                        </tr>
                        <tr v-if="cedsData">
                            <td class="text-right info-label">Existing CEDS:</td>
                            <td class="item-ceds-data">
                                <div class="ceds-content">
                                    <div class="ceds-header">
                                        <span class="ceds-id">{{ cedsData.GlobalID || cedsData.refId }}</span>
                                        <span class="ceds-name">{{ cedsData.ElementName || cedsData.name }}</span>
                                    </div>
                                    <div class="ceds-definition">{{ cedsData.Definition || cedsData.ElementDefinition || cedsData.description }}</div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="isLoadingCedsData">
                            <td class="text-right info-label">Existing CEDS:</td>
                            <td><v-progress-linear indeterminate color="primary" height="2"></v-progress-linear></td>
                        </tr>
                    </tbody>
                </v-table>
                
                <!-- Query input for semantic distance -->
                <v-row v-if="item.Description" class="mt-3 mb-0">
                    <v-col cols="12">
                        <v-text-field
                            v-model="customQuery"
                            label="Semantic Distance Query"
                            hint="Enter a custom query to compare with CEDS terms"
                            persistent-hint
                            density="compact"
                            variant="outlined"
                            :append-inner-icon="customQuery.trim() ? 'mdi-magnify-plus' : 'mdi-magnify'"
                            :append-inner-icon-color="customQuery.trim() ? 'primary' : undefined"
                            @click:append-inner="fetchCustomQuery"
                            @keyup.enter="fetchCustomQuery"
                        ></v-text-field>
                    </v-col>
                </v-row>
                
                <!-- Semantic distance results - displayed in reverse order (newest first) -->
                <div v-if="item.Description && currentItemResults.length > 0">
                    <div v-for="(resultData, index) in [...currentItemResults].reverse()" :key="index" class="mt-3">
                        <SemanticDistanceGrid
                            :sourceText="resultData.queryString"
                            :originalText="resultData.originalQuery"
                            :results="resultData.resultSet"
                            :error="namodelStore.semanticDistanceError"
                        />
                    </div>
                </div>
            </v-card-text>
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

.item-description {
    white-space: pre-wrap;
}

.item-xpath {
    font-family: monospace;
    color: #555;
}

.item-ceds-id {
    font-family: monospace;
    color: #0d47a1;
    font-weight: 500;
}

.item-ceds-data {
    vertical-align: top;
    padding-top: 4px !important;
}

.ceds-content {
    display: flex;
    flex-direction: column;
}

.ceds-header {
    display: flex;
    align-items: baseline;
    margin-bottom: 2px;
}

.ceds-id {
    font-family: monospace;
    color: #0d47a1;
    font-weight: 500;
    margin-right: 8px;
    background: rgba(13, 71, 161, 0.1);
    padding: 0 4px;
    border-radius: 3px;
}

.ceds-name {
    color: #333;
    font-weight: 500;
}

.ceds-definition {
    color: #555;
    font-style: italic;
    padding-left: 4px;
    white-space: pre-wrap;
    line-height: 1.2;
}
</style>