<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOntologyStore } from '@/stores/ontologyStore';
import DomainTabs from './DomainTabs.vue';
import ClassOutline from './ClassOutline.vue';
import ClassDetails from './ClassDetails.vue';
import CategorySearch from './CategorySearch.vue';
import ExportDialog from './ExportDialog.vue';

const route = useRoute();
const router = useRouter();
const ontologyStore = useOntologyStore();

const showExportDialog = ref(false);
const showSearch = ref(false);
const leftDrawerOpen = ref(true);

// Initialize data on mount
onMounted(async () => {
	await ontologyStore.loadDomains();
	
	// Handle deep linking
	if (route.params.domainId) {
		const domain = ontologyStore.domains.find(d => d.refId === route.params.domainId);
		if (domain) {
			await ontologyStore.selectDomain(domain);
			
			if (route.params.classId) {
				const classObj = ontologyStore.classes.find(c => c.refId === route.params.classId);
				if (classObj) {
					ontologyStore.selectClass(classObj);
				}
			}
		}
	}
	// Don't auto-load first domain to reduce initial API calls
	// User will click a tab when ready
});

// Update URL when selection changes
watch(() => ontologyStore.selectedClass, (newClass) => {
	if (newClass && ontologyStore.currentDomain) {
		router.push({
			path: `/ontology/${ontologyStore.currentDomain.refId}/${newClass.refId}`
		});
	}
});

// Handle domain change
const onDomainChange = async (domain) => {
	await ontologyStore.selectDomain(domain);
	router.push({
		path: `/ontology/${domain.refId}`
	});
};

// Handle class selection from outline
const onClassSelect = (classObj) => {
	ontologyStore.selectClass(classObj);
};

// Toggle search
const toggleSearch = () => {
	showSearch.value = !showSearch.value;
};

// Handle export
const handleExport = () => {
	showExportDialog.value = true;
};
</script>

<template>
	<v-container fluid class="pa-0 ontology-browser">
		<!-- Top toolbar with domain tabs -->
		<v-app-bar flat density="compact" color="white" class="border-b">
			<v-app-bar-nav-icon 
				@click="leftDrawerOpen = !leftDrawerOpen"
				class="d-lg-none"
			/>
			
			<v-toolbar-title class="text-h6">
				CEDS Ontology Browser
			</v-toolbar-title>
			
			<v-spacer />
			
			<v-btn 
				icon 
				@click="toggleSearch"
				:color="showSearch ? 'primary' : ''"
			>
				<v-icon>mdi-magnify</v-icon>
			</v-btn>
			
			<v-btn 
				icon 
				@click="handleExport"
			>
				<v-icon>mdi-download</v-icon>
			</v-btn>
		</v-app-bar>
		
		<!-- Search overlay -->
		<category-search 
			v-if="showSearch"
			@close="showSearch = false"
		/>
		
		<!-- Domain tabs -->
		<domain-tabs 
			:domains="ontologyStore.domains"
			:current-domain="ontologyStore.currentDomain"
			@domain-change="onDomainChange"
		/>
		
		<!-- Main content area -->
		<v-row no-gutters class="main-content">
			<!-- Left navigation drawer -->
			<v-navigation-drawer
				v-model="leftDrawerOpen"
				:rail="!leftDrawerOpen"
				permanent
				width="350"
				class="outline-drawer"
			>
				<class-outline
					:classes="ontologyStore.classes"
					:functional-areas="ontologyStore.functionalAreas"
					:selected-class="ontologyStore.selectedClass"
					:is-loading="ontologyStore.isLoading"
					@class-select="onClassSelect"
				/>
			</v-navigation-drawer>
			
			<!-- Main detail view -->
			<v-main class="detail-area">
				<v-container fluid class="pa-4">
					<class-details
						v-if="ontologyStore.selectedClass"
						:class-data="ontologyStore.selectedClass"
						:domain="ontologyStore.currentDomain"
					/>
					
					<v-card v-else flat class="text-center pa-8">
						<v-icon size="64" color="grey-lighten-1">
							mdi-file-tree-outline
						</v-icon>
						<v-card-title class="text-h5 mt-4">
							Select a Class
						</v-card-title>
						<v-card-text>
							Choose a class from the outline on the left to view its details
						</v-card-text>
					</v-card>
				</v-container>
			</v-main>
		</v-row>
		
		<!-- Export dialog -->
		<export-dialog 
			v-model="showExportDialog"
			@export="(format) => ontologyStore.exportData(format)"
		/>
		
		<!-- Loading overlay -->
		<v-overlay
			:model-value="ontologyStore.isLoading"
			persistent
			class="align-center justify-center"
		>
			<v-progress-circular
				indeterminate
				size="64"
				color="primary"
			/>
		</v-overlay>
		
		<!-- Error snackbar -->
		<v-snackbar
			:model-value="!!ontologyStore.error"
			@update:model-value="ontologyStore.error = null"
			color="error"
			timeout="5000"
		>
			{{ ontologyStore.error }}
			<template v-slot:actions>
				<v-btn
					variant="text"
					@click="ontologyStore.error = null"
				>
					Close
				</v-btn>
			</template>
		</v-snackbar>
	</v-container>
</template>

<style scoped>
.ontology-browser {
	height: calc(100vh - 64px);
	display: flex;
	flex-direction: column;
}

.main-content {
	flex: 1;
	overflow: hidden;
}

.outline-drawer {
	border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.detail-area {
	overflow-y: auto;
	height: 100%;
}

.border-b {
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>