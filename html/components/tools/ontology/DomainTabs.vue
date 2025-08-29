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

// Compute tab index based on current domain
const tabIndex = computed({
	get() {
		if (!props.currentDomain) return 0;
		const index = props.domains.findIndex(d => d.refId === props.currentDomain.refId);
		return index >= 0 ? index : 0;
	},
	set(value) {
		if (props.domains[value]) {
			emit('domain-change', props.domains[value]);
		}
	}
});

// Format domain name for display
const formatDomainName = (name) => {
	// Shorten long domain names for tabs
	const shortNames = {
		'People & Demographics': 'People',
		'Organizations & Institutions': 'Organizations',
		'Academic Programs & Courses': 'Programs',
		'Assessment & Evaluation': 'Assessment',
		'Student Services & Support': 'Services',
		'Facilities & Infrastructure': 'Facilities',
		'Finance & Administration': 'Finance',
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
</script>

<template>
	<client-only>
		<v-tabs
			v-model="tabIndex"
			bg-color="white"
			color="primary"
			align-tabs="start"
			show-arrows
			class="domain-tabs"
		>
			<v-tab
				v-for="(domain, index) in domains"
				:key="domain.refId"
				:value="index"
				class="text-none"
			>
				<v-badge
					:content="domain.classCount || 0"
					:color="getDomainColor(index)"
					inline
					class="mr-2"
				/>
				<span class="d-none d-md-inline">{{ domain.domainName }}</span>
				<span class="d-md-none">{{ formatDomainName(domain.domainName) }}</span>
			</v-tab>
		</v-tabs>
		<template #fallback>
			<v-skeleton-loader
				type="tabs"
				class="domain-tabs"
			/>
		</template>
	</client-only>
</template>

<style scoped>
.domain-tabs {
	border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.v-tab {
	min-width: 100px;
	font-weight: 500;
}

@media (max-width: 960px) {
	.v-tab {
		min-width: 80px;
		padding: 0 12px;
	}
}
</style>