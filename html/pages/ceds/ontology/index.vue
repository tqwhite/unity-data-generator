<script setup>
import CedsOntologyBrowser from '@/components/tools/ontology/CedsOntologyBrowser.vue';
import { useOntologyStore } from '@/stores/ontologyStore';
import { useRoute } from 'vue-router';
import { onMounted } from 'vue';

const route = useRoute();
const ontologyStore = useOntologyStore();

onMounted(() => {
	// Load initial data if needed
	// Check for domain query parameter
	const domainQuery = route.query.domain;
	if (domainQuery) {
		// Load domain if specified in query
		ontologyStore.selectDomainById(domainQuery);
	}
});
</script>

<template>
	<CedsOntologyBrowser />
</template>