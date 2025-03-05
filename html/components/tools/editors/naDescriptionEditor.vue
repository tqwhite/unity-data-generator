<script setup>
import { ref, watch, computed } from 'vue';
import { useNamodelStore } from '@/stores/namodelStore';

// Initialize the namodelStore
const namodelStore = useNamodelStore();

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
        await namodelStore.fetchSemanticDistance(queryString);
    }
};

// Format semantic results as pretty JSON string
const formattedSemanticResults = computed(() => {
    if (namodelStore.semanticDistanceResults.length === 0) {
        return "No results available";
    }
    return JSON.stringify(namodelStore.semanticDistanceResults, null, 2);
});

// Calculate relative distances compared to the first item as integers
const relativeDistances = computed(() => {
    if (!namodelStore.semanticDistanceResults.length) return [];
    
    const results = [...namodelStore.semanticDistanceResults];
    const firstDistance = parseFloat(results[0]?.distance || "0");
    
    // Convert the first distance to an integer by multiplying by 10000 and truncating
    const baseIntValue = Math.floor(firstDistance * 10000);
    
    return results.map((item, index) => {
        const currentDistance = parseFloat(item.distance || "0");
        // Convert current distance to integer
        const currentIntValue = Math.floor(currentDistance * 10000);
        
        if (index === 0) {
            // First item shows the integer version of raw distance
            return {
                ...item,
                relativeDistance: baseIntValue,
                rawDistance: item.distance,
                isRelative: false
            };
        } else {
            // Other items show the integer difference from the first item
            const relativeDiff = currentIntValue - baseIntValue;
            return {
                ...item,
                relativeDistance: relativeDiff,
                rawDistance: item.distance,
                isRelative: true
            };
        }
    });
});
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
                
                <!-- Semantic distance results -->
                <v-row v-if="item.Description && namodelStore.semanticDistanceResults.length > 0">
                    <v-col cols="12">
                        <v-card flat outlined class="mt-3">
                            <v-card-title class="text-subtitle-2">
                                Semantic Distance for: "{{ item.Description }}"
                                <v-chip 
                                    color="primary" 
                                    class="ml-2" 
                                    size="x-small"
                                >
                                    {{ namodelStore.semanticDistanceResults.length }} items
                                </v-chip>
                            </v-card-title>
                            <v-card-text class="pt-0">
                                <div v-if="namodelStore.semanticDistanceError" class="error-text">
                                    {{ namodelStore.semanticDistanceError }}
                                </div>
                                <!-- Table display for semantic distance results -->
                                <div class="table-container">
                                    <v-table density="compact" class="semantic-results-table">
                                        <thead>
                                            <tr>
                                                <th class="text-right distance-cell">Distance <span class="multiplier">(×10k)</span></th>
                                                <th class="text-left">Global ID</th>
                                                <th class="text-left">Element Name</th>
                                                <th class="text-left">Definition</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="(item, index) in relativeDistances" :key="index">
                                                <td class="distance-cell text-right" :class="{'relative-distance': item.isRelative}">
                                                    <template v-if="index === 0">
                                                        {{ item.relativeDistance }}
                                                    </template>
                                                    <template v-else>
                                                        {{ item.relativeDistance > 0 ? '+' : '' }}{{ item.relativeDistance }}
                                                    </template>
                                                </td>
                                                <td>{{ item.record?.GlobalID || 'N/A' }}</td>
                                                <td>{{ item.record?.ElementName || 'N/A' }}</td>
                                                <td class="definition-cell">{{ item.record?.Definition || 'No definition available' }}</td>
                                            </tr>
                                            <tr v-if="namodelStore.semanticDistanceResults.length === 0">
                                                <td colspan="4" class="text-center">No results available</td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
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

.table-container {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
}

.semantic-results-table {
    border: none;
    font-size: 0.75rem !important;
}

:deep(.semantic-results-table .v-table__wrapper) {
    font-size: 0.75rem !important;
}

:deep(.semantic-results-table th) {
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    padding: 4px 8px !important;
}

:deep(.semantic-results-table td) {
    font-size: 0.75rem !important;
    padding: 4px 8px;
}

.definition-cell {
    max-width: 400px;
    white-space: normal !important;
    word-break: normal;
}

.distance-cell {
    font-family: monospace;
    min-width: 100px;
    line-height: 1.2;
    padding-right: 64px !important;
}

.relative-distance {
    color: #1976D2;
}

.distance-note {
    font-size: 0.65rem;
    color: #757575;
    font-style: italic;
    margin-left: 4px;
}

.multiplier {
    font-size: 80%;
    color: #333;
}

.error-text {
    color: #f44336;
    margin-bottom: 10px;
}
</style>