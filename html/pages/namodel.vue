<script setup>
import { useLoginStore } from '@/stores/loginStore';
import { useNamodelStore } from '@/stores/namodelStore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import SelectionList from '@/components/selection-list.vue';

const LoginStore = useLoginStore();
const namodelStore = useNamodelStore();
const router = useRouter();

if (router?.currentRoute.value.query.logout) {
	LoginStore.logout();
}

// Selected ID is now maintained by the selection-list component
const selectedRefId = ref(null);

// Handle selection from the component
const handleSelection = (refId) => {
	selectedRefId.value = refId;
};
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main>
			<v-container fluid class="fill-height">
				<v-row no-gutters class="fill-height">
					<!-- Left sidebar with selection list component -->
					<v-col cols="2" class="border-r border-1">
						<selection-list 
							:store="namodelStore" 
							@select="handleSelection"
						/>
					</v-col>
					
					<!-- Main content area -->
					<v-col cols="6">
						<v-card flat class="h-100">
							<!-- Control buttons -->
							<v-toolbar flat density="compact">
								<v-toolbar-title>CONTROLS</v-toolbar-title>
								<v-spacer></v-spacer>
								<v-btn class="mr-2" variant="outlined">A</v-btn>
								<v-btn class="mr-2" variant="outlined">B</v-btn>
								<v-btn variant="outlined">C</v-btn>
							</v-toolbar>
							
							<!-- Tool area -->
							<v-card-text class="d-flex justify-center align-center text-subtitle-1 text-medium-emphasis tool-area">
								<div v-if="namodelStore.isLoading" class="text-center">
									<v-progress-circular indeterminate size="64" class="mb-3"></v-progress-circular>
									<div>Loading data...</div>
								</div>
								<div v-else-if="namodelStore.error" class="text-center text-error">
									<v-icon color="error" size="64" class="mb-3">mdi-alert-circle</v-icon>
									<div>{{ namodelStore.error }}</div>
								</div>
								<div v-else-if="namodelStore.currentData" class="w-100 h-100 overflow-auto">
									<!-- Data will be displayed here -->
									<pre class="data-display">{{ JSON.stringify(namodelStore.currentData, null, 2) }}</pre>
								</div>
								<div v-else class="text-center">
									<v-icon size="64" class="mb-3 text-medium-emphasis">mdi-database-search</v-icon>
									<div>Select an item from the list to view details</div>
								</div>
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
.data-display {
	text-align: left;
	width: 100%;
}
</style>