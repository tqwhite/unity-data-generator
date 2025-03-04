<template>
  <v-app>
    <generalNavSub />
    <v-main>
      <div class="utility-example">
        <h1>Utility Functions Example</h1>
        
        <div class="section">
          <h2>toType Function</h2>
          <div class="examples">
            <div v-for="(value, index) in testValues" :key="index" class="example-item">
              <strong>Value:</strong> {{ displayValue(value) }}<br>
              <strong>Type:</strong> {{ determineType(value) }}
            </div>
          </div>
        </div>

        <div class="section">
          <h2>qtPutSurePath Function</h2>
          <div class="input-group">
            <v-text-field v-model="path" label="Path (e.g. 'user.profile.name')" />
            <v-text-field v-model="value" label="Value" />
            <v-btn @click="addToObject" color="primary">Add to Object</v-btn>
          </div>
          
          <div class="result">
            <h3>Result Object:</h3>
            <pre>{{ JSON.stringify(resultObject, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import { toType, qtPutSurePath } from '@/plugins/qtools-functional-library';

// Test values for toType function
const testValues = [
  'hello',
  123,
  true,
  null,
  undefined,
  [],
  {},
  new Date(),
  () => {},
  Symbol('test')
];

// For qtPutSurePath demo
const resultObject = ref({});
const path = ref('user.profile.name');
const value = ref('John Doe');

// Display value for UI
function displayValue(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'function') return 'function() {...}';
  if (typeof val === 'symbol') return val.toString();
  if (val instanceof Date) return val.toString();
  if (Array.isArray(val)) return '[]';
  if (typeof val === 'object') return '{}';
  return String(val);
}

// Get type using our utility function
function determineType(val) {
  return toType(val);
}

// Add to object using qtPutSurePath
function addToObject() {
  qtPutSurePath(resultObject.value, path.value, value.value);
  // Force reactivity update
  resultObject.value = { ...resultObject.value };
}
</script>

<style scoped>
.utility-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.examples {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.example-item {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.result {
  margin-top: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>