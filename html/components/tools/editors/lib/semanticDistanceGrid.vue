<script setup>
import { computed } from 'vue';

// Define props for the component
const props = defineProps({
    // Source data (for display in the title)
    sourceText: {
        type: String,
        required: true
    },
    // Original query text (for reference)
    originalText: {
        type: String,
        default: ''
    },
    // Results data array
    results: {
        type: Array,
        required: true
    },
    // Error message if any
    error: {
        type: String,
        default: ''
    }
});

// Calculate relative distances compared to the first item as integers
const relativeDistances = computed(() => {
    if (!props.results || !props.results.length) return [];
    
    const results = [...props.results];
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
                isRelative: false
            };
        } else {
            // Other items show the integer difference from the first item
            const relativeDiff = currentIntValue - baseIntValue;
            return {
                ...item,
                relativeDistance: relativeDiff,
                isRelative: true
            };
        }
    });
});
</script>

<template>
    <v-card flat outlined>
        <v-card-title class="text-subtitle-2 font-weight-bold">
            Semantic Distance for: "{{ sourceText }}"
            <v-chip 
                color="primary" 
                class="ml-2" 
                size="x-small"
            >
                {{ results.length }} items
            </v-chip>
        </v-card-title>
        <v-card-subtitle v-if="originalText && originalText !== sourceText" class="text-caption py-0">
            <strong>Original input:</strong> "{{ originalText }}"
        </v-card-subtitle>
        <v-card-text class="pt-0">
            <div v-if="error" class="error-text">
                {{ error }}
            </div>
            <!-- Table display for semantic distance results -->
            <div class="table-container">
                <v-table density="compact" class="semantic-results-table">
                    <thead>
                        <tr>
                            <th class="text-right">Distance <span class="multiplier">(×10k)</span></th>
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
                        <tr v-if="results.length === 0">
                            <td colspan="4" class="text-center">No results available</td>
                        </tr>
                    </tbody>
                </v-table>
            </div>
        </v-card-text>
    </v-card>
</template>

<style scoped>
.table-container {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    overflow: hidden;
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
    padding: 4px 8px !important;
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
    padding-right: 32px !important;
}

.relative-distance {
    color: #1976D2;
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