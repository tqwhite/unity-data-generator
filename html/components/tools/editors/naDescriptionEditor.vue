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

// Watch for show changes to handle visibility
watch(() => props.show, (newVal) => {
    if (!newVal) {
        // Clean up or reset if needed when editor is closed
        showSemanticResults.value = false;
    }
});

// State for showing semantic results
const showSemanticResults = ref(false);

// Function to toggle semantic results display
const toggleSemanticResults = async () => {
    // If we don't have results yet, fetch them
    if (!namodelStore.hasSemanticDistanceResults && !namodelStore.isLoadingSemanticDistance) {
        await namodelStore.fetchSemanticDistance("family name");
    }
    showSemanticResults.value = !showSemanticResults.value;
};

// Format semantic results as pretty JSON string
const formattedSemanticResults = computed(() => {
    if (namodelStore.semanticDistanceResults.length === 0) {
        return "No results available";
    }
    return JSON.stringify(namodelStore.semanticDistanceResults, null, 2);
});
</script>

<template>
    <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="500">
        <v-card>
            <v-card-title class="text-h5 d-flex justify-space-between">
                Edit Item
                <v-btn icon @click="closeEditor">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-text v-if="item">
                <v-row>
                    <v-col cols="12">
                        <v-card-subtitle class="px-0 pt-0">Reference ID</v-card-subtitle>
                        <div class="item-refid">{{ item.refId || item._rowId }}</div>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12">
                        <v-card-subtitle class="px-0">Name</v-card-subtitle>
                        <div class="item-name">{{ item.Name }}</div>
                    </v-col>
                </v-row>
                
                <!-- Semantic distance button -->
                <v-row class="mt-4">
                    <v-col cols="12" class="d-flex justify-center">
                        <v-btn 
                            color="primary" 
                            @click="toggleSemanticResults"
                            :loading="namodelStore.isLoadingSemanticDistance"
                        >
                            {{ showSemanticResults ? 'Hide' : 'Show' }} Semantic Distance Results
                        </v-btn>
                    </v-col>
                </v-row>
                
                <!-- Semantic distance results -->
                <v-row v-if="showSemanticResults">
                    <v-col cols="12">
                        <v-card flat outlined class="mt-3">
                            <v-card-title class="text-subtitle-1">
                                Semantic Distance Results
                                <v-chip 
                                    color="primary" 
                                    class="ml-2" 
                                    size="small"
                                >
                                    {{ namodelStore.semanticDistanceResults.length }} items
                                </v-chip>
                            </v-card-title>
                            <v-card-text class="pt-0">
                                <div v-if="namodelStore.semanticDistanceError" class="error-text">
                                    {{ namodelStore.semanticDistanceError }}
                                </div>
                                <pre class="semantic-results">{{ formattedSemanticResults }}</pre>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.item-refid {
    font-weight: bold;
    font-size: 1.1rem;
    margin-bottom: 12px;
    font-family: monospace;
}

.item-name {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 12px;
}

.semantic-results {
    font-family: monospace;
    white-space: pre-wrap;
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    font-size: 0.9rem;
    max-height: 300px;
    overflow-y: auto;
}

.error-text {
    color: #f44336;
    margin-bottom: 10px;
}
</style>