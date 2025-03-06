<script setup>
import { ref, watch, computed } from 'vue';
import { useNamodelStore } from '@/stores/namodelStore';
import SemanticDistanceGrid from './lib/semanticDistanceGrid.vue';

// Initialize the namodelStore
const namodelStore = useNamodelStore();

// Custom query input
const customQuery = ref("");

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

// Watch for show changes to handle visibility and fetch data
watch(() => props.show, (newVal) => {
    if (newVal && props.item?.Description) {
        // Fetch semantic results when editor opens
        fetchSemanticResults();
    }
});

// Function to fetch semantic results
const fetchSemanticResults = async () => {
    // Fetch results using the Description field
    if (!namodelStore.isLoadingSemanticDistance && props.item) {
        const queryString = props.item.Description || "";
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
</style>