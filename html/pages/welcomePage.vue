<script setup>
import { useLoginStore } from '@/stores/loginStore';
const LoginStore = useLoginStore();
</script>

<template>
  <v-app>
    <generalNavSub />
    <v-main>
      <v-container class="welcome-container">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">
            <v-card class="mt-10 pa-6" elevation="3">
              <v-card-title class="text-h4 mb-4">Welcome to A4L Unity Data Generator</v-card-title>
              
              <v-card-text class="text-body-1">
                <p class="mb-3">
                  The A4L Unity Data Generator is a tool for working with educational data standards and models. 
                  This platform helps users explore and map Common Education Data Standards (CEDS) to 
                  the North American (NA) data model.
                </p>

                <p class="mb-3">
                  With this tool, you can:
                </p>

                <ul class="mb-5">
                  <li>Browse and search CEDS elements</li>
                  <li>View NA data model elements and relationships</li>
                  <li>Generate mappings between CEDS and NA data models</li>
                  <li>Analyze semantic similarities between data elements</li>
                </ul>

                <div class="highlighted-section pa-4 mb-4 rounded">
                  <h3 class="text-h6 mb-2">Explore CEDS Dataset</h3>
                  <p>
                    <strong>No login required!</strong> Click on the CEDS button in the navigation bar 
                    to access the Common Education Data Standards database. Browse through standardized 
                    education data elements and their definitions.
                  </p>
                  <p class="mt-2">
                    <v-icon color="info" class="mr-1">mdi-new-box</v-icon>
                    <strong>Coming Soon:</strong> AI-powered semantic search that helps you find relevant CEDS elements 
                    based on natural language descriptions and context. Our advanced semantic distance tools will 
                    make finding the right data elements easier than ever!
                  </p>
                </div>

                <p class="mb-3">
                  <strong>Getting Started:</strong>
                </p>
                <p>
                  Use the navigation buttons above to explore CEDS or log in for full access to all features 
                  including the NA model tools.
                </p>
              </v-card-text>
              
              <v-card-actions class="justify-center gap-3">
                <v-btn
                  color="secondary"
                  size="large"
                  prepend-icon="mdi-database-search"
                  :to="{ path: 'ceds' }"
                >
                  Explore CEDS
                </v-btn>
                
                <v-btn
                  v-if="!LoginStore.validUser"
                  color="primary"
                  size="large"
                  prepend-icon="mdi-login"
                  :to="{ path: '/', query: { login: true } }"
                >
                  Login for Full Access
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.welcome-container {
  min-height: calc(100vh - 180px);
  display: flex;
  align-items: center;
}

.highlighted-section {
  background-color: rgba(255, 196, 37, 0.1);
  border-left: 4px solid #ffc425;
}

.text-h6 {
  color: #333;
}
</style>