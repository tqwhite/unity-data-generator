<script setup>
import CedsOntologyBrowser from '@/components/tools/ontology/CedsOntologyBrowser.vue';
import { useRoute, useRouter } from 'vue-router';
import { useOntologyStore } from '@/stores/ontologyStore';
import { ref, onMounted, watch } from 'vue';

const route = useRoute();
const router = useRouter();
const ontologyStore = useOntologyStore();

// States for domain selection mode
const domainSelectionMode = ref(false);
const availableDomainsForClass = ref([]);
const isInitialMount = ref(true);

// Handle route changes (both initial mount and subsequent navigation)
const handleRouteChange = async () => {
	const classId = route.params.classId;
	const domainQuery = route.query.domain;

	if (!classId) {
		// No class specified, go to ontology home
		router.push('/ceds/ontology');
		return;
	}

	// Ensure domains are loaded first
	if (ontologyStore.domains.length === 0) {
		await ontologyStore.loadDomains();
	}

	if (!domainQuery) {
		// No domain specified - determine what to do
		const classDomains = await ontologyStore.getClassDomains(classId);

		if (classDomains.length === 0) {
			// No domains available, go to ontology home
			console.error('No domains available for class:', classId);
			router.push('/ceds/ontology');
		} else if (classDomains.length === 1) {
			// Single domain: auto-redirect with domain query
			router.replace({
				path: route.path,
				query: { domain: classDomains[0].refId }
			});
		} else {
			// Multiple domains: enable domain selection mode
			domainSelectionMode.value = true;
			availableDomainsForClass.value = classDomains;
			
			// Load the class data without domain context for display
			await ontologyStore.loadClassWithoutDomain(classId);
		}
	} else {
		// Domain specified: normal mode
		domainSelectionMode.value = false;
		availableDomainsForClass.value = [];
		
		ontologyStore.selectedClassId = classId;
		ontologyStore.selectedDomainId = domainQuery;
		
		// Select the domain and load its classes
		const domain = ontologyStore.domains.find(d => d.refId === domainQuery);
		if (domain) {
			await ontologyStore.selectDomain(domain, { preserveSelection: true });
			
			// After domain is selected and classes are loaded, select the class
			const classObj = ontologyStore.classes.find(c => c.refId === classId);
			if (classObj) {
				ontologyStore.selectClass(classObj);
			} else {
				console.warn(`Class ${classId} not found in domain ${domainQuery}`);
			}
		}
	}
};

onMounted(async () => {
	await handleRouteChange();
	isInitialMount.value = false;
});

// Watch for route changes after initial mount
watch(() => route.fullPath, async () => {
	if (!isInitialMount.value) {
		await handleRouteChange();
	}
});
</script>

<template>
	<!-- Always show the browser, pass domain selection state as props -->
	<CedsOntologyBrowser 
		:domain-selection-mode="domainSelectionMode"
		:available-domains-for-class="availableDomainsForClass"
		:initial-class-id="route.params.classId"
	/>
</template>