<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOntologyStore } from '@/stores/ontologyStore';
import DomainTabs from './DomainTabs.vue';
import ClassOutline from './ClassOutline.vue';
import ClassDetails from './ClassDetails.vue';
import CategorySearch from './CategorySearch.vue';
import ExportDialog from './ExportDialog.vue';
import DomainSelectorList from './DomainSelectorList.vue';

const props = defineProps({
	domainSelectionMode: {
		type: Boolean,
		default: false
	},
	availableDomainsForClass: {
		type: Array,
		default: () => []
	},
	initialClassId: {
		type: String,
		default: null
	}
});

const route = useRoute();
const router = useRouter();
const ontologyStore = useOntologyStore();

const showExportDialog = ref(false);
const showSearch = ref(false);
const leftDrawerOpen = ref(true);

// Computed property to determine if we're in domain selection mode
const isInDomainSelectionMode = computed(() => props.domainSelectionMode);

// Computed property to determine if we should show class details
const shouldShowClassDetails = computed(() => {
	return !!ontologyStore.selectedClass;
});

// Initialize data on mount
onMounted(async () => {
	// Only load domains if not already loaded
	if (ontologyStore.domains.length === 0) {
		await ontologyStore.loadDomains();
	}
	
	// The page component handles loading class data, so we don't need to do it here
	// This component just displays what's in the store
});

// Removed watcher - navigation now handled directly in event handlers

// Handle domain change with direct navigation
const onDomainChange = async (domain) => {
	// Load the domain data first
	await ontologyStore.selectDomain(domain);
	
	// Then navigate
	if (ontologyStore.selectedClass) {
		router.push(`/ceds/ontology/class/${ontologyStore.selectedClass.refId}?domain=${domain.refId}`);
	} else {
		router.push(`/ceds/ontology?domain=${domain.refId}`);
	}
};

// Handle class selection with direct navigation
const onClassSelect = async (classObj) => {
	// Just navigate - the page component will handle everything
	if (ontologyStore.currentDomain) {
		// Navigate with domain
		router.push({
			path: `/ceds/ontology/class/${classObj.refId}`,
			query: { domain: ontologyStore.currentDomain.refId }
		});
	} else {
		// Navigate without domain - page component will determine what to do
		router.push(`/ceds/ontology/class/${classObj.refId}`);
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

// Handle linked class selection from ClassDetails
const handleLinkedClassSelection = (refId) => {
	// Find the class in the current domain's classes
	const classObj = ontologyStore.classes.find(c => c.refId === refId);
	if (classObj) {
		onClassSelect(classObj);
	} else {
		console.warn(`Linked class ${refId} not found in current domain`);
	}
};
</script>

<template>
	<v-container fluid class="pa-0 ontology-browser">
		<!-- Top toolbar with domain tabs -->
		<v-app-bar flat density="compact" color="white" class="border-b">
			<v-app-bar-nav-icon 
				v-if="!isInDomainSelectionMode"
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
		<!-- Always show domain tabs, even in selection mode -->
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
				:rail="isInDomainSelectionMode ? false : !leftDrawerOpen"
				permanent
				width="350"
				class="outline-drawer"
				:mobile-breakpoint="0"
			>
				<!-- Show DomainSelectorList when in domain selection mode -->
				<domain-selector-list
					v-if="isInDomainSelectionMode"
					:domains="availableDomainsForClass"
					:class-id="initialClassId"
				/>
				
				<!-- Show ClassOutline in normal mode -->
				<class-outline
					v-else
					:classes="ontologyStore.classes"
					:functional-areas="ontologyStore.functionalAreas"
					:selected-class="ontologyStore.selectedClass"
					@class-select="onClassSelect"
				/>
			</v-navigation-drawer>
			
			<!-- Main detail view -->
			<v-main class="detail-area">
				<div class="detail-content">
					<!-- ClassDetails is now a pure display component -->
					<class-details
						v-if="shouldShowClassDetails"
						:class-data="ontologyStore.selectedClass"
						:domain="isInDomainSelectionMode ? { 
							refId: availableDomainsForClass[0]?.refId, 
							domainName: availableDomainsForClass[0]?.domainName 
						} : ontologyStore.currentDomain"
						:available-classes="ontologyStore.classes"
						@select-linked-class="handleLinkedClassSelection"
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
</style>