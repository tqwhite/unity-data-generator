<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  data: Object,
  // Current nesting level (starts at 1 for top level)
  level: {
    type: Number,
    default: 1
  },
  // Maximum level that should be expanded by default (e.g., 2 for first two levels)
  defaultExpanded: {
    type: Number,
    default: 2
  },
  // Whether to expand all panels
  expandAll: {
    type: Boolean,
    default: false
  }
});

// Compute which panel indices should be open based on the level
const openPanels = computed(() => {
  if (props.level <= props.defaultExpanded) {
    // If this level should be expanded, return array of panel indices
    return Object.keys(props.data || {}).map((_, index) => index);
  } else {
    // Otherwise return empty array (no panels open)
    return [];
  }
});

// Create a reactive reference to the model
const modelValue = ref(openPanels.value);
</script>

<template>
  <v-expansion-panel 
    v-for="(value, key) in data" 
    :key="key" 
    class="compact-panel"
    :class="{ 'higher-level': level <= 2, 'lower-level': level > 2 }"
  >
    <v-expansion-panel-title 
      :class="[
        'compact-panel-title', 
        level <= 2 ? 'text-h6' : 'text-subtitle-2'
      ]"
    >
      <div>
        <!-- Use metadata name if available, otherwise just use the key -->
        <template v-if="value && value._metadata">
          {{ value._metadata.name || key }}
        </template>
        <template v-else>{{ key }}</template>
      </div>
    </v-expansion-panel-title>
    <v-expansion-panel-text 
      class="compact-panel-text"
      :class="{ 'higher-level-text': level <= 2, 'lower-level-text': level > 2 }"
    >
      <!-- Show metadata if this is a leaf node with metadata -->
      <template v-if="value && value._metadata">
        <div class="metadata-section">
          <div class="metadata-item" v-if="value._metadata.description">
            <div class="metadata-label">Description:</div>
            <div class="metadata-value">{{ value._metadata.description }}</div>
          </div>
          <div class="metadata-item" v-if="value._metadata.xpath">
            <div class="metadata-label">XPath:</div>
            <div class="metadata-value metadata-xpath">{{ value._metadata.xpath }}</div>
          </div>
          <div class="metadata-item" v-if="value._metadata.type">
            <div class="metadata-label">Type:</div>
            <div class="metadata-value">{{ value._metadata.type }}</div>
          </div>
          <div class="metadata-item" v-if="value._metadata.characteristics">
            <div class="metadata-label">Characteristics:</div>
            <div class="metadata-value">{{ value._metadata.characteristics }}</div>
          </div>
          <div class="metadata-item" v-if="value._metadata.format">
            <div class="metadata-label">CodeSet:</div>
            <div class="metadata-value">{{ value._metadata.format }}</div>
          </div>
          <div class="metadata-item" v-if="value._metadata.cedsId">
            <div class="metadata-label">CEDS ID:</div>
            <div class="metadata-value metadata-cedsid">{{ value._metadata.cedsId }}</div>
          </div>
        </div>
      </template>
      
      <!-- Continue processing child nodes if there are any (excluding _metadata and _data properties) -->
      <template v-if="typeof value === 'object' && value !== null">
        <v-expansion-panels 
          v-if="Object.keys(value).filter(k => k !== '_metadata' && k !== '_data').length > 0"
          density="compact" 
          multiple 
          :model-value="expandAll || level < defaultExpanded ? Array.from({ length: Object.keys(value).filter(k => k !== '_metadata' && k !== '_data').length }, (_, i) => i) : []">
          <RecursivePanel 
            :data="Object.fromEntries(Object.entries(value).filter(([k]) => k !== '_metadata' && k !== '_data'))" 
            :level="level + 1"
            :default-expanded="defaultExpanded"
            :expand-all="expandAll"
          />
        </v-expansion-panels>
      </template>
      
      <!-- For primitive values (not objects) -->
      <template v-else-if="typeof value !== 'object' || value === null">
        <span :class="{ 'primitive-higher': level <= 2, 'primitive-lower': level > 2 }">
          {{ value }}
        </span>
      </template>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
/* Common styles for all panels */
.compact-panel :deep(.v-expansion-panel-title) {
  min-height: unset !important;
  padding: 4px 16px !important;
  cursor: pointer;
}

.compact-panel :deep(.v-expansion-panel-title:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

.compact-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 12px !important;
}

.compact-panel :deep(.v-expansion-panel-text) {
  font-size: 0.9rem;
  line-height: 1.2;
}

/* Higher level panels (levels 1-2) */
.higher-level :deep(.v-expansion-panel-title) {
  font-weight: 500;
}

/* Lower level panels (level 3+) */
.lower-level :deep(.v-expansion-panel-title) {
  font-size: 0.85rem !important;
  font-weight: 400;
}

.lower-level :deep(.v-expansion-panel-text) {
  font-size: 0.8rem;
  line-height: 1.1;
}

/* Apply indentation for deeper levels */
.lower-level :deep(.v-expansion-panel-text__wrapper) {
  padding-left: 10px !important;
}

/* Text style differentiation */
.higher-level-text {
  color: rgba(0, 0, 0, 0.87);
}

.lower-level-text {
  color: rgba(0, 0, 0, 0.7);
}

/* Primitive values styling */
.primitive-higher {
  font-size: 0.9rem;
  font-weight: 400;
}

.primitive-lower {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.7);
}

/* Metadata styling */
.metadata-section {
  margin-top: 4px;
  margin-bottom: 12px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 3px solid rgba(0, 0, 0, 0.1);
}

.metadata-item {
  display: flex;
  margin-bottom: 6px;
}

.metadata-label {
  font-weight: 500;
  color: #555;
  min-width: 100px;
  margin-right: 10px;
}

.metadata-value {
  color: #333;
  flex: 1;
  line-height: 1.4;
}

.metadata-xpath {
  font-family: monospace;
  color: #0d47a1;
  font-size: 0.9em;
}

.metadata-cedsid {
  font-family: monospace;
  color: #2e7d32;  /* Green color for CEDS ID */
  font-weight: 500;
  background-color: rgba(46, 125, 50, 0.1);
  padding: 1px 5px;
  border-radius: 3px;
  display: inline-block;
}
</style>

