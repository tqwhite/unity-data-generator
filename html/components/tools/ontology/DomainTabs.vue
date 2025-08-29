<script setup>
import { computed } from 'vue';

const props = defineProps({
	domains: {
		type: Array,
		required: true,
		default: () => []
	},
	currentDomain: {
		type: Object,
		default: null
	}
});

const emit = defineEmits(['domain-change']);

// Select a domain
const selectDomain = (domain) => {
	emit('domain-change', domain);
};

// Check if domain is selected
const isDomainSelected = (domain) => {
	return props.currentDomain?.refId === domain.refId;
};

// Format domain name for display
const formatDomainName = (name) => {
	// Shorten long domain names for buttons
	const shortNames = {
		'People & Demographics': 'People & Demographics',
		'Organizations & Institutions': 'Organizations',
		'Academic Programs & Courses': 'Academic Programs',
		'Assessment & Evaluation': 'Assessment',
		'Student Services & Support': 'Student Services',
		'Facilities & Infrastructure': 'Facilities',
		'Finance & Administration': 'Finance & Admin',
		'Credentials & Recognition': 'Credentials',
		'Uncategorized': 'Other'
	};
	return shortNames[name] || name;
};

// Get color for domain
const getDomainColor = (index) => {
	const colors = [
		'blue', 'green', 'orange', 'purple', 
		'teal', 'indigo', 'pink', 'brown', 'grey'
	];
	return colors[index % colors.length];
};

// Get only first 9 domains for the grid
const gridDomains = computed(() => {
	return props.domains.slice(0, 9);
});

// Get remaining domains if any
const extraDomains = computed(() => {
	return props.domains.slice(9);
});
</script>

<template>
	<v-container fluid class="domain-grid-container pa-2 mt-2">
		<!-- 3x3 Grid of domain buttons -->
		<v-row dense>
			<v-col
				v-for="(domain, index) in gridDomains"
				:key="domain.refId"
				cols="4"
				class="pa-1"
			>
				<v-btn
					:color="isDomainSelected(domain) ? getDomainColor(index) : undefined"
					:variant="isDomainSelected(domain) ? 'flat' : 'outlined'"
					:elevation="isDomainSelected(domain) ? 2 : 0"
					@click="selectDomain(domain)"
					class="domain-button"
					density="compact"
					size="small"
					block
				>
					<div class="text-caption">
						{{ formatDomainName(domain.domainName) }}
						<span class="text-grey ml-1">({{ domain.classCount || 0 }})</span>
					</div>
				</v-btn>
			</v-col>
		</v-row>
		
		<!-- Extra domains if more than 9 -->
		<v-row v-if="extraDomains.length > 0" dense class="mt-2">
			<v-col cols="12">
				<v-expansion-panels variant="accordion">
					<v-expansion-panel>
						<v-expansion-panel-title>
							More Domains ({{ extraDomains.length }})
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<v-row dense>
								<v-col
									v-for="(domain, index) in extraDomains"
									:key="domain.refId"
									cols="4"
									class="pa-1"
								>
									<v-btn
										:color="isDomainSelected(domain) ? getDomainColor(index + 9) : undefined"
										:variant="isDomainSelected(domain) ? 'flat' : 'outlined'"
										@click="selectDomain(domain)"
										block
									>
										{{ formatDomainName(domain.domainName) }}
									</v-btn>
								</v-col>
							</v-row>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-col>
		</v-row>
	</v-container>
</template>

<style scoped>
.domain-grid-container {
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
	background-color: #fafafa;
	max-width: 100%;
}

.domain-button {
	height: 36px !important;
	text-transform: none !important;
	font-size: 0.75rem !important;
}

.domain-button .text-caption {
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

@media (max-width: 960px) {
	.domain-button {
		height: 32px !important;
	}
	
	.domain-button .text-caption {
		font-size: 0.7rem !important;
	}
}
</style>