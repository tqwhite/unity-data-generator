<script setup>
import { useLoginStore } from '@/stores/loginStore';
import { ref, onMounted } from 'vue';

const LoginStore = useLoginStore();
const showDialog = ref(false);

// Show dialog when component is mounted
onMounted(() => {
  showDialog.value = true;
});

const closeDialog = () => {
  showDialog.value = false;
};
</script>

<template>
  <v-app>
    <generalNavSub />
    
    <!-- Conference Welcome Dialog -->
    <v-dialog v-model="showDialog" max-width="600">
      <v-card>
        <div class="d-flex align-center position-relative">
          <v-btn
            icon
            variant="text"
            size="small"
            class="position-absolute"
            style="top: 8px; right: 8px;"
            @click="closeDialog"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-card-title class="text-h5 pa-4 text-center w-100">
            Conference Welcome Message
          </v-card-title>
        </div>
        
        <v-card-text class="pa-4">
          <p class="text-body-1 mb-4">
            In honor of the 2025 A4L Annual Conference, I have temporarily made the entire site available without logging in. I hope you enjoy it. 

          </p>
          <p class="text-body-1 mb-4">
            Please remember that this site is a prototype. I am not entirely happy with the semantic search 
            results and things are quite slow. That will change but not yet.
          </p>
          
          <p class="text-body-1 mb-4">
            Also, send email to me, tq@justkidding.com, to tell me what you think. 
          </p>
          
          <p class="text-body-1 font-weight-medium mb-4">
            Thanks for your attention and interest.<br>
            TQ White II
          </p>
          
          <p class="text-body-1 font-italic mb-2">
            PS. Here is a link to video I made before the conference showing how the site works:
          </p>
          
          <div class="text-center mb-2">
            <a href="https://app.screencast.com/EazOoRyrNxEep" target="_blank" class="text-decoration-none">
              <v-btn color="primary" variant="outlined">
                <v-icon start>mdi-video</v-icon>
                Video Demo
              </v-btn>
            </a>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4 justify-center">
          <v-btn 
            color="primary" 
            size="large" 
            variant="elevated" 
            @click="closeDialog"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
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