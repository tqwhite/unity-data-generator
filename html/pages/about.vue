<template>
  <v-app>
    <generalNavSub />
    <v-main>
      <v-container fluid>
        <v-row>
          <v-col cols="12">
            <v-card class="pa-4 mx-auto" max-width="800">
              <v-card-title class="text-h4 mb-4">About AI and Data Modeling</v-card-title>
              <v-card-text class="text-body-1">
                About AI and Data Modeling
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>
/* Add any page-specific styles here */
</style>