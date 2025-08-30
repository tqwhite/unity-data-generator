<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
	domains: {
		type: Array,
		required: true
	},
	classId: {
		type: String,
		required: true
	}
});

const router = useRouter();

// Direct navigation with selected domain
const selectDomain = (domain) => {
	router.push(`/ceds/ontology/class/${props.classId}?domain=${domain.refId}`);
};

// Go back to ontology home
const goBack = () => {
	router.push('/ceds/ontology');
};
</script>

<template>
	<v-container class="d-flex align-center justify-center fill-height">
		<!-- Loading state -->
		<v-card max-width="600" width="100%" v-if="!domains || domains.length === 0">
			<v-card-text class="text-center pa-8">
				<v-progress-circular
					indeterminate
					size="64"
					color="primary"
				/>
				<div class="mt-4">Loading domains...</div>
			</v-card-text>
		</v-card>
		
		<!-- Domain selector -->
		<v-card max-width="600" width="100%" v-else>
			<v-card-title class="text-h5">
				Select Domain Context
			</v-card-title>
			
			<v-card-subtitle>
				This class exists in multiple domains. Please select which domain context you'd like to view it in.
			</v-card-subtitle>
			
			<v-divider />
			
			<v-list>
				<v-list-item 
					v-for="domain in domains" 
					:key="domain.refId"
					@click="selectDomain(domain)"
					:title="domain.domainName || domain.label || domain.name || domain.refId"
					:subtitle="domain.description || `Domain: ${domain.refId}`"
					lines="two"
				>
					<template v-slot:prepend>
						<v-icon color="primary">
							mdi-folder-outline
						</v-icon>
					</template>
					
					<template v-slot:append>
						<v-icon>
							mdi-chevron-right
						</v-icon>
					</template>
				</v-list-item>
			</v-list>
			
			<v-divider />
			
			<v-card-actions>
				<v-btn
					variant="text"
					@click="goBack"
				>
					Cancel
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-container>
</template>

<style scoped>
.fill-height {
	min-height: calc(100vh - 200px);
}
</style>