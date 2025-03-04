<script setup>
import { useLoginStore } from '@/stores/loginStore';
import { useCedsStore } from '@/stores/cedsStore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import SelectionList from '@/components/selection-list.vue';
import JsonTool from '@/components/tools/json-tool.vue';
import SpreadsheetTool from '@/components/tools/spreadsheet-tool.vue';
import OutlineTool from '@/components/tools/outline-tool.vue';

const LoginStore = useLoginStore();
const cedsStore = useCedsStore();
const router = useRouter();

if (router?.currentRoute.value.query.logout) {
	LoginStore.logout();
}

// Selected ID is now maintained by the selection-list component
const selectedRefId = ref(null);

// Selected tool - default to JSON tool
const selectedTool = ref('json');

// Handle selection from the component
const handleSelection = (refId) => {
	selectedRefId.value = refId;
};

// Handle tool selection
const selectTool = (toolName) => {
	selectedTool.value = toolName;
};
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main>
			<v-container fluid class="fill-height">
				<v-row no-gutters class="fill-height">
					<!-- Left sidebar with selection list component -->
					<v-col cols="auto" style="width: 320px; min-width: 320px; max-width: 320px;" class="border-r border-1">
						<selection-list 
							:store="cedsStore" 
							@select="handleSelection"
						/>
					</v-col>
					
					<!-- Main content area -->
					<v-col style="flex: 1; min-width: 0; max-width: calc(100vw - 320px);">
						<v-card flat class="h-100">
							<!-- Control buttons -->
							<v-toolbar flat density="compact">
								<v-spacer></v-spacer>
								<v-btn 
									class="mr-2" 
									variant="outlined" 
									:disabled="selectedTool === 'json'"
									@click="selectTool('json')"
									prepend-icon="mdi-code-json"
								>
									JSON
								</v-btn>
								<v-btn 
									class="mr-2" 
									variant="outlined" 
									:disabled="selectedTool === 'spreadsheet'"
									@click="selectTool('spreadsheet')"
									prepend-icon="mdi-table"
								>
									Spreadsheet
								</v-btn>
								<v-btn 
									variant="outlined" 
									:disabled="selectedTool === 'outline'"
									@click="selectTool('outline')"
									prepend-icon="mdi-file-tree"
								>
									Outline
								</v-btn>
							</v-toolbar>
							
							<!-- Tool area -->
							<v-card-text class="d-flex justify-center align-center text-subtitle-1 text-medium-emphasis tool-area">
								<json-tool 
									v-if="selectedTool === 'json'"
									:data="cedsStore.currentData"
									:is-loading="cedsStore.isLoading"
									:error="cedsStore.error"
								/>
								<spreadsheet-tool 
									v-else-if="selectedTool === 'spreadsheet'"
									:data="cedsStore.currentData"
									:is-loading="cedsStore.isLoading"
									:error="cedsStore.error"
								/>
								<outline-tool 
									v-else-if="selectedTool === 'outline'"
									:data="cedsStore.currentData"
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