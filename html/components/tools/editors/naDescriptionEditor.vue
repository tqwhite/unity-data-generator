<script setup>
import { ref, watch } from 'vue';

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
    }
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
</style>