<script setup>
	import { useLoginStore } from '@/stores/loginStore';
	import { useCedsStore } from '@/stores/cedsStore';
	import { ref, computed, onMounted } from 'vue';
	import { useRouter } from 'vue-router';
	
	const LoginStore = useLoginStore();
	const cedsStore = useCedsStore();
	const router = useRouter();

	if (router?.currentRoute.value.query.logout) {
		LoginStore.logout();
	}

	const selectedRefId = ref(null);
	const searchQuery = ref('');
	
	// Filtered nameList based on search
	const filteredNameList = computed(() => {
		if (!searchQuery.value || !cedsStore.nameList) return cedsStore.nameList;
		
		const query = searchQuery.value.toLowerCase();
		return cedsStore.nameList.filter(item => 
			item.name?.toLowerCase().includes(query) || 
			item.refId?.toLowerCase().includes(query)
		);
	});
	
	// Load name list on component mount
	onMounted(async () => {
		if (!cedsStore.hasNameList) {
			await cedsStore.fetchNameList();
		}
	});
	
	// Handler for item selection
	const selectItem = async (refId) => {
		selectedRefId.value = refId;
		await cedsStore.fetchData(refId);
	};

</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main>
			<v-container fluid class="fill-height">
				<v-row no-gutters class="fill-height">
					<!-- Left sidebar - List and selector -->
					<v-col cols="3" class="border-r border-1">
						<v-card flat class="h-100">
							<v-card-title class="text-h6 py-3 px-4">LIST</v-card-title>
							
							<!-- Search box -->
							<v-text-field
								v-model="searchQuery"
								label="Search"
								prepend-inner-icon="mdi-magnify"
								variant="outlined"
								density="compact"
								hide-details
								class="mx-3 mb-3"
							></v-text-field>
							
							<!-- Selector list -->
							<v-list class="overflow-y-auto" style="max-height: calc(100vh - 200px)">
								<v-list-item
									v-for="item in filteredNameList"
									:key="item.refId"
									:active="selectedRefId === item.refId"
									@click="selectItem(item.refId)"
								>
									<v-list-item-title>{{ item.name || item.refId }}</v-list-item-title>
								</v-list-item>
								
								<v-list-item v-if="cedsStore.isLoading">
									<v-list-item-title>
										<v-progress-circular indeterminate size="20" class="mr-2"></v-progress-circular>
										Loading...
									</v-list-item-title>
								</v-list-item>
								
								<v-list-item v-else-if="filteredNameList.length === 0">
									<v-list-item-title class="text-subtitle-2 text-medium-emphasis">
										No items found
									</v-list-item-title>
								</v-list-item>
							</v-list>
						</v-card>
					</v-col>
					
					<!-- Main content area -->
					<v-col cols="9">
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
							<v-card-text class="d-flex justify-center align-center text-subtitle-1 text-medium-emphasis" style="min-height: calc(100vh - 180px)">
								<div v-if="cedsStore.isLoading" class="text-center">
									<v-progress-circular indeterminate size="64" class="mb-3"></v-progress-circular>
									<div>Loading data...</div>
								</div>
								<div v-else-if="cedsStore.error" class="text-center text-error">
									<v-icon color="error" size="64" class="mb-3">mdi-alert-circle</v-icon>
									<div>{{ cedsStore.error }}</div>
								</div>
								<div v-else-if="cedsStore.currentData" class="w-100 h-100">
									<!-- Data will be displayed here -->
									<pre>{{ JSON.stringify(cedsStore.currentData, null, 2) }}</pre>
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
</style>