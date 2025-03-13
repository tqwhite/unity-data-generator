<script setup>
import { useLoginStore } from '@/stores/loginStore';
import { useCedsStore } from '@/stores/cedsStore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import JsonTool from '@/components/tools/json-tool.vue';
import SpreadsheetTool from '@/components/tools/spreadsheet-tool.vue';
import OutlineTool from '@/components/tools/outline-tool.vue';
import CedsSearch from '@/components/tools/ceds-search.vue';
import CedsBrowse from '@/components/tools/ceds-browse.vue';

const LoginStore = useLoginStore();
const cedsStore = useCedsStore();
const router = useRouter();

if (router?.currentRoute.value.query.logout) {
	LoginStore.logout();
}

// Selected tool - default to Search tool
const selectedTool = ref('search');

// Handle tool selection
const selectTool = (toolName) => {
	selectedTool.value = toolName;
};
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main style="padding-top: 65px;">
			<v-container fluid class="fill-height">
				<v-row no-gutters class="fill-height">
					<!-- Main content area -->
					<v-col style="flex: 1;">
						<v-card flat class="h-100">
							<!-- Control buttons -->
							<v-toolbar flat density="compact" color="white">
								<v-spacer></v-spacer>
								<v-btn 
									class="mr-2" 
									variant="outlined" 
									:disabled="selectedTool === 'search'"
									@click="selectTool('search')"
									prepend-icon="mdi-magnify"
								>
									Search
								</v-btn>
								<v-btn 
									class="mr-2" 
									variant="outlined" 
									:disabled="selectedTool === 'browse'"
									@click="selectTool('browse')"
									prepend-icon="mdi-file-tree"
								>
									Browse
								</v-btn>
							</v-toolbar>
							
							<!-- Tool area -->
							<v-card-text class="d-flex justify-center align-center text-subtitle-1 text-medium-emphasis tool-area">
								<json-tool 
									v-if="selectedTool === 'json'"
									:workingData="cedsStore.combinedObject"
									:is-loading="cedsStore.isLoading"
									:error="cedsStore.error"
								/>
								<ceds-search 
									v-else-if="selectedTool === 'search'"
									:workingData="cedsStore.listOfProperties"
									:is-loading="cedsStore.isLoading"
									:error="cedsStore.error"
								/>
								<ceds-browse 
									v-else-if="selectedTool === 'browse'"
									:workingData="cedsStore.combinedObject"
									:is-loading="cedsStore.isLoading"
									:error="cedsStore.error"
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
/* Prevent container padding for a true full-height layout */
:deep(.v-container) {
	padding: 0;
}
.tool-area {
	min-height: calc(100vh - 180px);
}
/* Styling now handled by the json-tool component */
</style>