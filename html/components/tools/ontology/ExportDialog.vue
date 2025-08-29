<script setup>
import { ref } from 'vue';

const props = defineProps({
	modelValue: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['update:modelValue', 'export']);

const selectedFormat = ref('json');

const formats = [
	{
		value: 'json',
		title: 'JSON',
		description: 'JavaScript Object Notation - structured data format',
		icon: 'mdi-code-json'
	},
	{
		value: 'csv',
		title: 'CSV',
		description: 'Comma-separated values - spreadsheet compatible',
		icon: 'mdi-file-delimited'
	},
	{
		value: 'rdf',
		title: 'RDF',
		description: 'Resource Description Framework - semantic web format',
		icon: 'mdi-semantic-web',
		disabled: true
	}
];

// Handle export
const handleExport = () => {
	const data = emit('export', selectedFormat.value);
	
	if (data) {
		// Create download
		const blob = new Blob([data], { 
			type: selectedFormat.value === 'json' ? 'application/json' : 'text/csv' 
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `ceds-ontology-export.${selectedFormat.value}`;
		link.click();
		URL.revokeObjectURL(url);
	}
	
	// Close dialog
	emit('update:modelValue', false);
};

// Close dialog
const close = () => {
	emit('update:modelValue', false);
};
</script>

<template>
	<v-dialog
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
		max-width="500"
	>
		<v-card>
			<v-card-title>
				Export Ontology Data
			</v-card-title>
			
			<v-card-text>
				<div class="text-body-1 mb-4">
					Select the format for exporting the current domain's classes and metadata.
				</div>
				
				<v-radio-group v-model="selectedFormat">
					<v-radio
						v-for="format in formats"
						:key="format.value"
						:value="format.value"
						:disabled="format.disabled"
					>
						<template v-slot:label>
							<div class="d-flex align-center">
								<v-icon
									:icon="format.icon"
									class="mr-2"
								/>
								<div>
									<div class="font-weight-medium">
										{{ format.title }}
										<v-chip
											v-if="format.disabled"
											size="x-small"
											class="ml-2"
										>
											Coming soon
										</v-chip>
									</div>
									<div class="text-caption text-grey">
										{{ format.description }}
									</div>
								</div>
							</div>
						</template>
					</v-radio>
				</v-radio-group>
			</v-card-text>
			
			<v-card-actions>
				<v-spacer />
				<v-btn
					variant="text"
					@click="close"
				>
					Cancel
				</v-btn>
				<v-btn
					color="primary"
					variant="flat"
					@click="handleExport"
				>
					Export
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>