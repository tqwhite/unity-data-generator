<script setup>
import { ref, onMounted } from 'vue';
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
	
	// Handle deep linking from route parameters
	const classId = route.params.classId;
	const domainQuery = route.query.domain;
	
	if (domainQuery) {
		const domain = ontologyStore.domains.find(d => d.refId === domainQuery);
		if (domain) {
			await ontologyStore.selectDomain(domain);
		}
	}
	
	if (classId) {
		const classObj = ontologyStore.classes.find(c => c.refId === classId);
		if (classObj) {
			ontologyStore.selectClass(classObj);
		}
	}
	// Don't auto-load first domain to reduce initial API calls
	// User will click a tab when ready
});

// Removed watcher - navigation now handled directly in event handlers

// Handle domain change with direct navigation
const onDomainChange = async (domain) => {
	await ontologyStore.selectDomain(domain);
	
	// Direct navigation with domain query
	if (ontologyStore.selectedClass) {
		router.push(`/ceds/ontology/class/${ontologyStore.selectedClass.refId}?domain=${domain.refId}`);
	} else {
		router.push(`/ceds/ontology?domain=${domain.refId}`);
	}
};

// Handle class selection with direct navigation
const onClassSelect = async (classObj) => {
	ontologyStore.selectClass(classObj);
	
	// Check if we have a domain context
	if (ontologyStore.currentDomain) {
		// Navigate with domain
		router.push({
			path: `/ceds/ontology/class/${classObj.refId}`,
			query: { domain: ontologyStore.currentDomain.refId }
		});
	} else {
		// Check how many domains this class belongs to
		const domains = await ontologyStore.getClassDomains(classObj.refId);
		
		if (domains.length === 1) {
			// Auto-navigate with single domain
			router.push({
				path: `/ceds/ontology/class/${classObj.refId}`,
				query: { domain: domains[0].refId }
			});
		} else {
			// Navigate without domain (will show selector)
			router.push(`/ceds/ontology/class/${classObj.refId}`);
		}
	}
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
				:mobile-breakpoint="0"
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
				<div class="detail-content">
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
				</div>
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

.v-main {
	flex: 1 0 auto;
	max-width: 100%;
	transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	padding-left: 10px; /* snuggles up against nav, looks great, incomprehensible*/
	padding-right: var(--v-layout-right);
	padding-top: 10px;
	padding-bottom: var(--v-layout-bottom);
}


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
	height: 100%;
}

.detail-content {
	height: 100%;
	overflow-y: auto;
}

.border-b {
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

/* Disable all transitions in the ontology browser */
.ontology-browser * {
	transition: none !important;
	animation: none !important;
}

/* Specifically target Vuetify overlays */
.v-overlay__scrim {
	display: none !important;
}

.v-overlay {
	transition: none !important;
}
</style>