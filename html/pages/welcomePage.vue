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
              <v-card-title class="text-h5 mb-4">Welcome to A4L Unity CEDS Project</v-card-title>
              
              <v-card-text class="text-body-1">
                <p class="mb-3">
                  The A4L Unity CEDS Project is a tool for working with educational data standards and models. 
                  This platform helps users explore and map Common Education Data Standards (CEDS) to 
                  the SIF Unity Data Model.
                </p>

                <p class="mb-3">
                  With this tool, you can:
                </p>

                <ul class="mb-5">
                  <li>Browse and search CEDS elements</li>
                </ul>
              <v-card-actions class="justify-center gap-3">
                <v-btn
                  color="secondary"
                  size="large"
                  prepend-icon="mdi-database-search"
                  :to="{ path: 'ceds' }"
                >
                  Explore CEDS
                </v-btn>
       
              </v-card-actions>
                <ul class="mb-5">
                  <li>View NA data model elements and relationships</li>
                  <li>Generate mappings between CEDS and NA data models</li>
                  <li>Analyze semantic similarities between data elements</li>
                  <li style='font-weight:bold;font-size:105%;'>NEW: Vote for quality of AI CEDS definition proposals!!</li>
                </ul>
              <v-card-actions class="justify-center gap-3">
      
                
                <v-btn
                  color="primary"
                  size="large"
                  prepend-icon="mdi-database-search"
                  :to="{ path: 'namodel' }"
                >
                  Explore Unity Data Model
                </v-btn>
              </v-card-actions>

   
              </v-card-text>
              
  
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