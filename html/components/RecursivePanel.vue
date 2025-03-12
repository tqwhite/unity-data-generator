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
    >{{ key }}</v-expansion-panel-title>
    <v-expansion-panel-text 
      class="compact-panel-text"
      :class="{ 'higher-level-text': level <= 2, 'lower-level-text': level > 2 }"
    >
      <template v-if="typeof value === 'object' && value !== null">
        <v-expansion-panels 
          density="compact" 
          multiple 
          :model-value="expandAll || level < defaultExpanded ? Array.from({ length: Object.keys(value || {}).length }, (_, i) => i) : []">
          <RecursivePanel 
            :data="value" 
            :level="level + 1"
            :default-expanded="defaultExpanded"
            :expand-all="expandAll"
          />
        </v-expansion-panels>
      </template>
      <template v-else>
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
</style>

