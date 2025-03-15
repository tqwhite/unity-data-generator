<script setup>
import { ref } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  },
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const closePanel = () => {
  emit('close');
};
</script>

<template>
  <v-overlay
    v-if="isOpen"
    :value="isOpen"
    class="align-center justify-center"
  >
    <v-card
      class="sample-object-panel"
      max-width="800px"
      max-height="80vh"
      overflow-y="auto"
    >
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <span>Sample Object</span>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="closePanel"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <div class="text-h6 mb-2">{{ data.Name || 'Unnamed Object' }}</div>
        
        <!-- This is a placeholder for future content -->
        <div class="placeholder-message">
          Additional object details will be displayed here.
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
  </v-overlay>
</template>

<style scoped>
.sample-object-panel {
  width: 90%;
  max-width: 800px;
  margin: auto;
}

.placeholder-message {
  margin-top: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 4px;
  text-align: center;
  color: rgba(0, 0, 0, 0.6);
}
</style>