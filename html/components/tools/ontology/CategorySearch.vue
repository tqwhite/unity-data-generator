<script setup>
import { ref } from 'vue';
import { useOntologyStore } from '@/stores/ontologyStore';

const emit = defineEmits(['close']);

const ontologyStore = useOntologyStore();
const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);

// Perform search
const performSearch = async () => {
	if (!searchQuery.value.trim()) {
		searchResults.value = [];
		return;
	}
	
	isSearching.value = true;
	try {
		// For now, do a simple client-side search
		// In production, this would call a search API endpoint
		const query = searchQuery.value.toLowerCase();
		const results = [];
		
		// Search across all domains if global, otherwise just current domain
		const domainsToSearch = ontologyStore.searchScope === 'global' 
			? ontologyStore.domains 
			: [ontologyStore.currentDomain];
		
		for (const domain of domainsToSearch) {
			// Load classes for this domain if needed
			if (domain !== ontologyStore.currentDomain) {
				// Would need to load classes for other domains
				// For now, skip
				continue;
			}
			
			// Search in current domain's classes
			ontologyStore.classes.forEach(cls => {
				if (cls.name?.toLowerCase().includes(query) ||
					cls.label?.toLowerCase().includes(query) ||
					cls.description?.toLowerCase().includes(query)) {
					results.push({
						...cls,
						domainName: domain.domainName,
						domainRefId: domain.refId
					});
				}
			});
		}
		
		searchResults.value = results;
	} finally {
		isSearching.value = false;
	}
};

// Select a search result
const selectResult = async (result) => {
	// Switch to the domain if needed
	if (result.domainRefId !== ontologyStore.currentDomain?.refId) {
		const domain = ontologyStore.domains.find(d => d.refId === result.domainRefId);
		if (domain) {
			await ontologyStore.selectDomain(domain);
		}
	}
	
	// Select the class
	ontologyStore.selectClass(result);
	
	// Close search
	emit('close');
};

// Toggle search scope
const toggleScope = () => {
	ontologyStore.searchScope = ontologyStore.searchScope === 'domain' ? 'global' : 'domain';
	// Re-run search with new scope
	performSearch();
};
</script>

<template>
	<v-card class="search-overlay">
		<v-card-title class="d-flex align-center">
			<span>Search Classes</span>
			<v-spacer />
			<v-btn
				icon
				variant="text"
				@click="$emit('close')"
			>
				<v-icon>mdi-close</v-icon>
			</v-btn>
		</v-card-title>
		
		<v-card-text>
			<!-- Search input -->
			<v-text-field
				v-model="searchQuery"
				@input="performSearch"
				placeholder="Search for classes..."
				prepend-inner-icon="mdi-magnify"
				variant="outlined"
				autofocus
				clearable
				:loading="isSearching"
			/>
			
			<!-- Search scope toggle -->
			<v-radio-group
				:model-value="ontologyStore.searchScope"
				@update:model-value="toggleScope"
				inline
				hide-details
				class="mb-4"
			>
				<v-radio
					label="Current Domain"
					value="domain"
				/>
				<v-radio
					label="All Domains"
					value="global"
				/>
			</v-radio-group>
			
			<!-- Search results -->
			<v-list
				v-if="searchResults.length > 0"
				density="compact"
				max-height="400"
				class="overflow-y-auto"
			>
				<v-list-item
					v-for="result in searchResults"
					:key="result.refId"
					@click="selectResult(result)"
				>
					<v-list-item-title>
						{{ result.label || result.prefLabel || result.name }}
					</v-list-item-title>
					<v-list-item-subtitle>
						<v-chip size="x-small" class="mr-2">
							{{ result.domainName }}
						</v-chip>
						{{ result.description }}
					</v-list-item-subtitle>
				</v-list-item>
			</v-list>
			
			<!-- Empty state -->
			<v-card
				v-else-if="searchQuery && !isSearching"
				flat
				class="text-center pa-4"
			>
				<v-icon size="48" color="grey-lighten-1">
					mdi-magnify-close
				</v-icon>
				<div class="text-body-1 mt-2">
					No classes found matching "{{ searchQuery }}"
				</div>
				<div class="text-body-2 text-grey mt-1">
					Try searching {{ ontologyStore.searchScope === 'domain' ? 'all domains' : 'in current domain' }}
				</div>
			</v-card>
		</v-card-text>
	</v-card>
</template>

<style scoped>
.search-overlay {
	position: absolute;
	top: 64px;
	left: 50%;
	transform: translateX(-50%);
	width: 90%;
	max-width: 600px;
	z-index: 1000;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>