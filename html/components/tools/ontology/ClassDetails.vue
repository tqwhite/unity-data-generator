<script setup>
import { computed } from 'vue';

const props = defineProps({
	classData: {
		type: Object,
		required: true
	},
	domain: {
		type: Object,
		required: true
	}
});

// Format other domains for display
const otherDomainsFormatted = computed(() => {
	if (!props.classData.otherDomains || props.classData.otherDomains.length === 0) {
		return null;
	}
	
	return props.classData.otherDomains.map(d => {
		// Convert refId to readable name
		return d.replace('DOM_', '').replace(/___/g, ' & ').replace(/_/g, ' ');
	}).join(', ');
});

// Parse metadata from jsonString if available
const parsedMetadata = computed(() => {
	if (!props.classData.jsonString) {
		return {};
	}
	
	try {
		const parsed = JSON.parse(props.classData.jsonString);
		return {
			superClasses: parsed.superClasses || [],
			equivalentClasses: parsed.equivalentClasses || [],
			comment: parsed.comment || props.classData.description
		};
	} catch (e) {
		console.error('Failed to parse jsonString:', e);
		return {
			comment: props.classData.description
		};
	}
});

// Get property count
const propertyCount = computed(() => {
	return props.classData.propertyCount || 0;
});

// Copy deep link to clipboard
const copyDeepLink = () => {
	const url = `${window.location.origin}/ontology/${props.domain.refId}/${props.classData.refId}`;
	navigator.clipboard.writeText(url).then(() => {
		// Could show a snackbar here
		console.log('Deep link copied:', url);
	});
};

// Format confidence score
const confidencePercent = computed(() => {
	if (!props.classData.confidence) return null;
	return Math.round(props.classData.confidence * 100);
});
</script>

<template>
	<v-card flat>
		<!-- Header -->
		<v-card-title class="text-h5 pb-0">
			{{ classData.label || classData.prefLabel || classData.name }}
			<v-chip
				v-if="classData.isPrimary"
				size="small"
				color="primary"
				class="ml-2"
			>
				Primary
			</v-chip>
			<v-chip
				v-if="confidencePercent"
				size="small"
				variant="outlined"
				class="ml-2"
			>
				{{ confidencePercent }}% match
			</v-chip>
		</v-card-title>
		
		<!-- Multi-domain indicator -->
		<v-alert
			v-if="otherDomainsFormatted"
			type="info"
			variant="tonal"
			density="compact"
			class="ma-4 mb-0"
		>
			<strong>Also categorized in:</strong> {{ otherDomainsFormatted }}
		</v-alert>
		
		<!-- Class ID and deep link -->
		<v-card-subtitle class="mt-2">
			<span class="text-mono">{{ classData.notation || classData.refId }}</span>
			<v-btn
				icon
				size="x-small"
				variant="text"
				@click="copyDeepLink"
				class="ml-2"
			>
				<v-icon size="small">mdi-link</v-icon>
				<v-tooltip activator="parent" location="top">
					Copy deep link
				</v-tooltip>
			</v-btn>
		</v-card-subtitle>
		
		<!-- Description -->
		<v-card-text>
			<div class="text-body-1 mb-4">
				{{ classData.definition || parsedMetadata.comment || classData.description || 'No description available' }}
			</div>
			
			<!-- Metadata sections -->
			<div class="metadata-sections">
				<!-- Properties -->
				<v-card variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-code-braces</v-icon>
						Properties
						<v-chip size="small" class="ml-2">{{ propertyCount }}</v-chip>
					</v-card-title>
					<v-card-text class="pt-1">
						<div v-if="propertyCount > 0">
							<p class="text-body-2">
								This class has {{ propertyCount }} associated properties.
							</p>
							<!-- Properties would be listed here if we had them -->
						</div>
						<div v-else class="text-body-2 text-grey">
							No properties defined for this class.
						</div>
					</v-card-text>
				</v-card>
				
				<!-- Super classes -->
				<v-card v-if="parsedMetadata.superClasses?.length > 0" variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-family-tree</v-icon>
						Super Classes
						<v-chip size="small" class="ml-2">{{ parsedMetadata.superClasses.length }}</v-chip>
					</v-card-title>
					<v-card-text class="pt-1">
						<v-list density="compact">
							<v-list-item
								v-for="(superClass, index) in parsedMetadata.superClasses"
								:key="index"
								:title="superClass"
							/>
						</v-list>
					</v-card-text>
				</v-card>
				
				<!-- Equivalent classes -->
				<v-card v-if="parsedMetadata.equivalentClasses?.length > 0" variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-equal</v-icon>
						Equivalent Classes
						<v-chip size="small" class="ml-2">{{ parsedMetadata.equivalentClasses.length }}</v-chip>
					</v-card-title>
					<v-card-text class="pt-1">
						<v-list density="compact">
							<v-list-item
								v-for="(equivClass, index) in parsedMetadata.equivalentClasses"
								:key="index"
								:title="equivClass"
							/>
						</v-list>
					</v-card-text>
				</v-card>
				
				<!-- Technical details -->
				<v-card variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-information-outline</v-icon>
						Technical Details
					</v-card-title>
					<v-card-text class="pt-1">
						<v-table density="compact">
							<tbody>
								<tr>
									<td class="font-weight-bold">Reference ID</td>
									<td class="text-mono">{{ classData.refId }}</td>
								</tr>
								<tr>
									<td class="font-weight-bold">Class Code</td>
									<td class="text-mono">{{ classData.notation || 'N/A' }}</td>
								</tr>
								<tr>
									<td class="font-weight-bold">Domain</td>
									<td>{{ domain.domainName }}</td>
								</tr>
								<tr v-if="classData.confidence">
									<td class="font-weight-bold">Categorization Confidence</td>
									<td>{{ confidencePercent }}%</td>
								</tr>
								<tr v-if="classData.createdAt">
									<td class="font-weight-bold">Created</td>
									<td>{{ new Date(classData.createdAt).toLocaleDateString() }}</td>
								</tr>
								<tr v-if="classData.updatedAt">
									<td class="font-weight-bold">Updated</td>
									<td>{{ new Date(classData.updatedAt).toLocaleDateString() }}</td>
								</tr>
							</tbody>
						</v-table>
					</v-card-text>
				</v-card>
			</div>
		</v-card-text>
	</v-card>
</template>

<style scoped>
.text-mono {
	font-family: 'Courier New', Courier, monospace;
}

.metadata-sections .v-card-title {
	background-color: rgba(0, 0, 0, 0.02);
	font-weight: 500;
}
</style>