<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLoginStore } from '@/stores/loginStore';

const route = useRoute();
const router = useRouter();
const LoginStore = useLoginStore();

// Handle logout query parameter
if (router?.currentRoute.value.query.logout) {
	LoginStore.logout();
}

// Tool configuration
const tools = [
	{ 
		name: 'ontology',
		path: '/ceds/ontology',
		label: 'Ontology Browser',
		icon: 'mdi-file-tree-outline'
	},
	{ 
		name: 'search',
		path: '/ceds/search',
		label: 'Semantic Search',
		icon: 'mdi-magnify'
	}
];

// Determine active tool from current route
const activeTool = computed(() => {
	const path = route.path;
	if (path.includes('/search')) return 'search';
	return 'ontology';
});

// Direct navigation to tools
const navigateToTool = (tool) => {
	router.push(tool.path);
};
</script>

<template>
	<v-app>
		<generalNavSub />
		<v-main style="padding-top: 72px;">
			<v-container fluid class="fill-height">
				<v-card flat class="h-100">
					<v-toolbar flat density="compact">
						<v-spacer />
						<v-btn
							v-for="tool in tools"
							:key="tool.name"
							:variant="activeTool === tool.name ? 'flat' : 'outlined'"
							:color="activeTool === tool.name ? 'primary' : ''"
							:prepend-icon="tool.icon"
							@click="navigateToTool(tool)"
							class="mr-2"
						>
							{{ tool.label }}
						</v-btn>
					</v-toolbar>

					<v-card-text class="pa-0">
						<NuxtPage /> <!-- Child routes render here -->
					</v-card-text>
				</v-card>
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