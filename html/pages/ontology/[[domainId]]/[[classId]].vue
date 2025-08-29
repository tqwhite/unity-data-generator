<script setup>
import CedsOntologyBrowser from '@/components/tools/ontology/CedsOntologyBrowser.vue';

// This page supports deep linking with optional parameters:
// /ontology - shows default domain
// /ontology/DOM_Assessment___Evaluation - shows specific domain
// /ontology/DOM_Assessment___Evaluation/CLASS_123 - shows specific class in domain
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main style="padding-top: 65px;">
			<CedsOntologyBrowser />
		</v-main>
	</v-app>
</template>

<style scoped>
/* Ensure full height */
:deep(.v-main__wrap) {
	height: 100%;
}
</style>