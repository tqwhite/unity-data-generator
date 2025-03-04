<script setup>
defineProps({ data: Object });
</script>

<template>
  <v-expansion-panel v-for="(value, key) in data" :key="key" class="compact-panel">
    <v-expansion-panel-title class="compact-panel-title">{{ key }}</v-expansion-panel-title>
    <v-expansion-panel-text class="compact-panel-text">
      <template v-if="typeof value === 'object' && value !== null">
        <v-expansion-panels density="compact">
          <RecursivePanel :data="value" />
        </v-expansion-panels>
      </template>
      <template v-else>
        {{ value }}
      </template>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
.compact-panel :deep(.v-expansion-panel-title) {
  min-height: unset !important;
  padding: 4px 16px !important;
  font-size: 0.95rem;
}

.compact-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 12px !important;
}

.compact-panel :deep(.v-expansion-panel-text) {
  font-size: 0.9rem;
  line-height: 1.2;
}
</style>

