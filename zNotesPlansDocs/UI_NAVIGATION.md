# Navigation Pattern Implementation Guide

This document provides step-by-step instructions for implementing the two-level navigation pattern used in this project, where a primary navigation button leads to a page with secondary tool selection buttons.

## Pattern Overview

The navigation consists of:

1. **Primary Navigation**: Top-level buttons in a shared navigation component that route to different pages
2. **Secondary Navigation**: Tool selection buttons within each page that switch between different functional components

## Reference Files for Study/Copying

### Primary Navigation Component

- **File**: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/html/components/generalNavSub.vue`
- **Key sections**: Lines 76-83 (NA Model button), Lines 19-22 (page detection logic)

### Example Implementation Pages

- **NA Model Page**: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/html/pages/namodel.vue`
- **CEDS Page**: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/html/pages/ceds.vue`
- **Key sections**: Tool selection logic (lines 24-47 in namodel.vue), toolbar (lines 72-109), conditional rendering (lines 113-136)

## Step-by-Step Implementation

### Step 1: Add Primary Navigation Button

1. **Locate your main navigation component** (equivalent to `generalNavSub.vue`)

2. **Add page detection logic** in the `<script setup>` section:
   
   ```javascript
   const isYourNewPage = computed(() => {
       return router.currentRoute.value.path === '/your-new-route' || 
              router.currentRoute.value.path === '/your-new-route/';
   });
   ```

3. **Add the navigation button** in the template section:
   
   ```vue
   <v-btn
       v-if="!isYourNewPage"
       prepend-icon="mdi-your-icon"
       title="Your Tool Description"
       :to="{ path: 'your-new-route' }"
   >
       Your Button Text
   </v-btn>
   ```

4. **Add title logic** to the app bar title section:
   
   ```vue
   <template v-else-if="isYourNewPage">Your Page Title</template>
   ```

### Step 2: Create the New Page Component

1. **Create new page file**: `pages/your-new-route.vue`

2. **Set up the basic structure** using this template:
   
   ```vue
   <script setup>
   import { useLoginStore } from '@/stores/loginStore';
   import { ref } from 'vue';
   import { useRouter } from 'vue-router';
   
   // Import your tool components
   import YourFirstTool from '@/components/tools/your-first-tool.vue';
   import YourSecondTool from '@/components/tools/your-second-tool.vue';
   
   const LoginStore = useLoginStore();
   const router = useRouter();
   
   // Handle logout if needed
   if (router?.currentRoute.value.query.logout) {
       LoginStore.logout();
   }
   
   // Selected tool - set your default
   const selectedTool = ref('first-tool');
   
   // Handle tool selection
   const selectTool = (toolName) => {
       selectedTool.value = toolName;
   
       // Add any tool-specific logic here
       // Example: if (toolName === 'specific-tool') { /* special handling */ }
   };
   </script>
   
   <template>
       <v-app>
           <generalNavSub />
           <v-main style="padding-top: 65px;">
               <v-container fluid class="fill-height">
                   <v-row no-gutters class="fill-height">
                       <!-- Add sidebar if needed (see namodel.vue lines 58-66) -->
   
                       <!-- Main content area -->
                       <v-col style="flex: 1;">
                           <v-card flat class="h-100">
                               <!-- Tool selection toolbar -->
                               <v-toolbar flat density="compact" color="white">
                                   <v-spacer></v-spacer>
   
                                   <!-- Add your tool buttons here -->
                                   <v-btn 
                                       class="mr-2"
                                       variant="outlined" 
                                       :disabled="selectedTool === 'first-tool'"
                                       @click="selectTool('first-tool')"
                                       prepend-icon="mdi-your-first-icon"
                                   >
                                       First Tool
                                   </v-btn>
   
                                   <v-btn 
                                       variant="outlined" 
                                       :disabled="selectedTool === 'second-tool'"
                                       @click="selectTool('second-tool')"
                                       prepend-icon="mdi-your-second-icon"
                                   >
                                       Second Tool
                                   </v-btn>
                               </v-toolbar>
   
                               <!-- Tool area with conditional rendering -->
                               <v-card-text class="d-flex justify-center align-center text-subtitle-1 text-medium-emphasis tool-area">
                                   <your-first-tool 
                                       v-if="selectedTool === 'first-tool'"
                                       :your-props="yourData"
                                   />
                                   <your-second-tool 
                                       v-else-if="selectedTool === 'second-tool'"
                                       :your-props="yourData"
                                   />
                               </v-card-text>
                           </v-card>
                       </v-col>
                   </v-row>
               </v-container>
           </v-main>
       </v-app>
   </template>
   
   <style scoped>
   .h-100 {
       height: 100%;
   }
   :deep(.v-container) {
       padding: 0;
   }
   .tool-area {
       min-height: calc(100vh - 180px);
   }
   </style>
   ```

### Step 3: Create Tool Components

1. **Create your tool components** in `components/tools/` directory
2. **Each tool should accept props** for data and state management
3. **Follow the existing pattern** from components like:
   - `components/tools/json-tool.vue`
   - `components/tools/spreadsheet-tool.vue`
   - `components/tools/outline-tool.vue`

### Step 4: Add Data Management (Optional)

If you need state management:

1. **Create a store** following the pattern in `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/html/stores/namodelStore.js`
2. **Import and use the store** in your page component
3. **Pass store data to your tool components** via props

### Step 5: Add Sidebar (Optional)

If you need a sidebar like the NA Model page:

1. **Study the sidebar implementation** in `namodel.vue` lines 58-66
2. **Import the tabbed-selection component** or create your own
3. **Add the sidebar column** before your main content area
4. **Handle selection events** from the sidebar

## Key Implementation Notes

### Button States

- Use `:disabled="selectedTool === 'tool-name'"` to highlight the active tool
- Use `variant="outlined"` for consistent styling
- Add appropriate icons with `prepend-icon`

### Conditional Rendering

- Use `v-if` and `v-else-if` to show only the active tool component
- Ensure each condition matches the tool names used in `selectTool()`

### Styling Consistency

- Use `class="mr-2"` for button spacing
- Use `flat density="compact" color="white"` for toolbar styling
- Maintain the `.tool-area` class for consistent content height

### Data Flow

- Pass data to tools via props (`:your-props="yourData"`)
- Handle tool-specific state in the `selectTool()` function
- Consider using a store for complex data management

## Testing Your Implementation

1. **Verify primary navigation** - clicking the main button should route to your new page
2. **Test tool switching** - secondary buttons should switch between tools without page reload
3. **Check button states** - active tool button should be disabled/highlighted
4. **Confirm data flow** - ensure your tools receive the correct props
5. **Validate styling** - page should match the existing design patterns

## Common Pitfalls

- **Route conflicts**: Ensure your route path doesn't conflict with existing routes
- **Component imports**: Verify all tool components are properly imported
- **Tool names consistency**: Tool names in `selectTool()` must match those in conditional rendering
- **Props naming**: Ensure prop names match between parent and child components
- **Missing icons**: Verify all MDI icons exist or choose alternatives

This pattern provides a clean, scalable way to organize complex functionality within a single page while maintaining consistent navigation UX across your application.