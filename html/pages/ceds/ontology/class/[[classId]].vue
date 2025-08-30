<script setup>
import CedsOntologyBrowser from '@/components/tools/ontology/CedsOntologyBrowser.vue';
import ViewInDomainSelector from '@/components/tools/ontology/ViewInDomainSelector.vue';
import { useRoute, useRouter } from 'vue-router';
import { useOntologyStore } from '@/stores/ontologyStore';
import { ref, onMounted } from 'vue';

const route = useRoute();
const router = useRouter();
const ontologyStore = useOntologyStore();

const showDomainSelector = ref(false);
const availableDomains = ref([]);

onMounted(async () => {
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

	// Load class data - for now returns all domains as fallback
	const classDomains = await ontologyStore.getClassDomains(classId);

	if (!domainQuery) {
		if (classDomains.length === 0) {
			// No domains available, go to ontology home
			console.error('No domains available for class:', classId);
			router.push('/ceds/ontology');
		} else if (classDomains.length === 1) {
			// Single domain: auto-add domain query
			router.replace({
				path: route.path,
				query: { domain: classDomains[0].refId }
			});
		} else if (classDomains.length > 1) {
			// Multiple domains: show selector
			showDomainSelector.value = true;
			availableDomains.value = classDomains;
		}
	} else {
		// Domain specified: load normally
		ontologyStore.selectedClassId = classId;
		ontologyStore.selectedDomainId = domainQuery;
		
		// Also select the domain in the store
		const domain = ontologyStore.domains.find(d => d.refId === domainQuery);
		if (domain) {
			await ontologyStore.selectDomain(domain);
		}
	}
});
</script>

<template>
	<ViewInDomainSelector 
		v-if="showDomainSelector"
		:domains="availableDomains"
		:class-id="route.params.classId"
	/>

	<CedsOntologyBrowser v-else />
</template>