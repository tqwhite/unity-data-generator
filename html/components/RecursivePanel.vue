<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';

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
  },
  // Target path to expand and scroll to (array of keys)
  targetPath: {
    type: Array,
    default: () => []
  }
});

// Check if a key is on the target path at the current level
const isOnTargetPath = (key, index) => {
  // If there's no target path, it's not on the path
  if (!props.targetPath || !Array.isArray(props.targetPath) || props.targetPath.length === 0) {
    return false;
  }
  
  // Calculate the path index we need to check
  const pathIndex = props.level - 1;
  
  // If the path doesn't have an entry for this level, it's not on the path
  if (pathIndex >= props.targetPath.length) {
    return false;
  }
  
  // Check if this key matches the target path at the current level
  // Use string comparison to be more forgiving with type mismatches
  return String(props.targetPath[pathIndex]) === String(key);
};

// Compute which panel indices should be open based on level and target path
const openPanels = computed(() => {
  const dataKeys = Object.keys(props.data || {});
  
  // If expandAll is active, expand everything
  if (props.expandAll) {
    return dataKeys.map((_, index) => index);
  }
  
  // Calculate which panels should be open
  return dataKeys.reduce((indices, key, index) => {
    // Open if within default expansion level
    if (props.level <= props.defaultExpanded) {
      indices.push(index);
    }
    // Or open if on the target path
    else if (isOnTargetPath(key, index)) {
      indices.push(index);
    }
    return indices;
  }, []);
});

// Create a reactive reference to track open panels
const modelValue = ref(openPanels.value);

// Use a map to store refs for multiple panels
const panelRefs = ref(new Map());

// Track if we've found and scrolled to the target element
const hasScrolledToTarget = ref(false);

// Method to set a panel ref
const setPanelRef = (el, key) => {
  if (el && isTargetNode(key)) {
    panelRefs.value.set(key, el);
    console.log('Set panel ref for key:', key);
  }
};

// Check if current node is the target (last item in path)
const isTargetNode = (key) => {
  // Safety checks
  if (!props.targetPath || !Array.isArray(props.targetPath) || props.targetPath.length === 0) {
    return false;
  }
  
  // Current node is the target if:
  // 1. We are at the correct level (matching the path length)
  // 2. The key matches the last element in the path
  return props.targetPath.length === props.level && 
         String(props.targetPath[props.level - 1]) === String(key);
};

// Determine which nested panels should be open
const getNestedOpenPanels = (parentKey, value) => {
  // Get child keys (excluding metadata and data)
  const childKeys = Object.keys(value).filter(k => k !== '_metadata' && k !== '_data');
  
  // If expandAll is true, or we're in default expansion level, expand all children
  if (props.expandAll || props.level < props.defaultExpanded) {
    return Array.from({ length: childKeys.length }, (_, i) => i);
  }
  
  // If parent is on the target path, we may need to keep the path to target open
  if (isOnTargetPath(parentKey)) {
    // Create array of indices to expand
    return childKeys.reduce((indices, childKey, index) => {
      // Check if this child is on the target path
      const childPathIndex = props.level; // Child level is parent level + 1
      if (props.targetPath && props.targetPath.length > childPathIndex && 
          props.targetPath[childPathIndex] === childKey) {
        indices.push(index);
      }
      return indices;
    }, []);
  }
  
  // Default case - nothing expanded
  return [];
};

// Watch for changes to targetPath and scroll to target when ready
watch(() => props.targetPath, async (newPath) => {
  if (newPath && newPath.length > 0) {
    console.log('Target path changed in RecursivePanel at level', props.level, ':', newPath);
    
    // Reset scroll flag when path changes
    hasScrolledToTarget.value = false;
    
    // Force update of model value based on the new target path
    modelValue.value = openPanels.value;
    
    // Give time for DOM to update
    await nextTick();
    
    // Try to scroll to the target after a short delay to ensure DOM updates
    setTimeout(async () => {
      await nextTick();
      
      // Check if we are at the target level
      if (props.level === newPath.length) {
        const targetKey = newPath[props.level - 1];
        console.log('Looking for target key:', targetKey, 'at level:', props.level);
        
        // Get the panel element from our map
        const panelElement = panelRefs.value.get(targetKey);
        
        if (panelElement && !hasScrolledToTarget.value) {
          console.log('Found panel element for target key:', targetKey);
          
          try {
            // Scroll the element into view
            panelElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            // Add visual feedback
            panelElement.style.transition = 'background-color 0.5s ease';
            panelElement.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
            
            setTimeout(() => {
              panelElement.style.backgroundColor = '';
              setTimeout(() => {
                panelElement.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
                setTimeout(() => {
                  panelElement.style.backgroundColor = '';
                }, 500);
              }, 500);
            }, 500);
            
            hasScrolledToTarget.value = true;
          } catch (e) {
            console.error('Error scrolling to element:', e);
          }
        } else {
          console.log('Panel element not found for key:', targetKey, 'at level:', props.level);
          console.log('Available keys in map:', [...panelRefs.value.keys()]);
        }
      }
    }, 300); // Wait 300ms to ensure panels have expanded
  }
}, { immediate: true, deep: true });
</script>

<template>
  <v-expansion-panel 
    v-for="(value, key) in data" 
    :key="key" 
    class="compact-panel"
    :class="{ 'higher-level': level <= 2, 'lower-level': level > 2, 'target-node': isTargetNode(key) }"
    :ref="el => setPanelRef(el, key)"
  >
    <v-expansion-panel-title 
      :class="[
        'compact-panel-title', 
        level <= 2 ? 'text-h6' : 'text-subtitle-2',
        isTargetNode(key) ? 'target-node-title' : ''
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
          :model-value="getNestedOpenPanels(key, value)">
          <RecursivePanel 
            :data="Object.fromEntries(Object.entries(value).filter(([k]) => k !== '_metadata' && k !== '_data'))" 
            :level="level + 1"
            :default-expanded="defaultExpanded"
            :expand-all="expandAll"
            :target-path="targetPath"
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

/* Target node highlighting */
.target-node {
  border-left: 3px solid #1976d2;
  background-color: rgba(25, 118, 210, 0.05);
}

.target-node-title {
  font-weight: 600 !important;
  color: #1976d2 !important;
}

.target-node:deep(.v-expansion-panel-title:hover) {
  background-color: rgba(25, 118, 210, 0.1);
}
</style>

