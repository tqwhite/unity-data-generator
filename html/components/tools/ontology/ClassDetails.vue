<script setup>
import { computed } from 'vue';
import { useOntologyStore } from '@/stores/ontologyStore';

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

const ontologyStore = useOntologyStore();

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

// Parse all RDF relationships
const rdfRelationships = computed(() => {
	const relationships = {
		metadata: [],
		outgoing: [],
		incoming: []
	};
	
	// Add metadata triples
	const classUri = props.classData.uri || `http://ceds.ed.gov/terms#${props.classData.name}`;
	
	// Type triple
	relationships.metadata.push({
		subject: classUri,
		predicate: 'rdf:type',
		predicateLabel: 'Type',
		object: props.classData.classType || 'owl:Class'
	});
	
	// SubClassOf (from jsonString or default)
	if (parsedMetadata.value.superClasses && parsedMetadata.value.superClasses.length > 0) {
		parsedMetadata.value.superClasses.forEach(superClass => {
			relationships.metadata.push({
				subject: classUri,
				predicate: 'rdfs:subClassOf',
				predicateLabel: 'Subclass Of',
				object: superClass
			});
		});
	} else {
		relationships.metadata.push({
			subject: classUri,
			predicate: 'rdfs:subClassOf',
			predicateLabel: 'Subclass Of',
			object: 'BaseCEDSResource'
		});
	}
	
	// Label triple
	if (props.classData.label || props.classData.prefLabel) {
		relationships.metadata.push({
			subject: classUri,
			predicate: 'rdfs:label',
			predicateLabel: 'Label',
			object: props.classData.label || props.classData.prefLabel
		});
	}
	
	// Notation
	if (props.classData.notation) {
		relationships.metadata.push({
			subject: classUri,
			predicate: 'skos:notation',
			predicateLabel: 'Notation',
			object: props.classData.notation
		});
	}
	
	// Parse outgoing properties (where this class is domain)
	if (props.classData.properties && props.classData.properties.length > 0) {
		props.classData.properties.forEach(prop => {
			let propData = {};
			if (prop.jsonString) {
				try {
					propData = JSON.parse(prop.jsonString);
				} catch (e) {
					console.error('Failed to parse property jsonString:', e);
				}
			}
			
			const triple = {
				subject: classUri,
				predicate: prop.uri || prop.name,
				predicateLabel: prop.label || prop.comment || prop.name,
				object: null,
				direction: 'outgoing'
			};
			
			if (propData.rangeIncludes && propData.rangeIncludes.length > 0) {
				triple.object = propData.rangeIncludes[0];
			} else if (propData.ranges && propData.ranges.length > 0) {
				triple.object = propData.ranges[0].uri;
			}
			
			relationships.outgoing.push(triple);
		});
	}
	
	// Parse incoming properties (where this class is range)
	if (props.classData.incomingProperties && props.classData.incomingProperties.length > 0) {
		props.classData.incomingProperties.forEach(prop => {
			let propData = {};
			if (prop.jsonString) {
				try {
					propData = JSON.parse(prop.jsonString);
				} catch (e) {
					console.error('Failed to parse incoming property jsonString:', e);
				}
			}
			
			const triple = {
				subject: propData.domainIncludes ? propData.domainIncludes[0] : 'Unknown',
				predicate: prop.uri || prop.name,
				predicateLabel: prop.label || prop.comment || prop.name,
				object: classUri,
				direction: 'incoming'
			};
			
			relationships.incoming.push(triple);
		});
	}
	
	return relationships;
});

// Get property counts
const propertyCount = computed(() => {
	const outgoing = props.classData.properties?.length || 0;
	const incoming = props.classData.incomingProperties?.length || 0;
	return {
		outgoing,
		incoming,
		total: outgoing + incoming
	};
});

// Copy deep link to clipboard
const copyDeepLink = () => {
	const url = `${window.location.origin}/ontology/${props.domain.refId}/${props.classData.refId}`;
	navigator.clipboard.writeText(url).then(() => {
		// Could show a snackbar here
		console.log('Deep link copied:', url);
	});
};

// Get class name by refId or URI
const getClassName = (classIdentifier) => {
	if (!classIdentifier) return '';
	
	// Extract refId from URI if needed (e.g., "http://ceds.ed.gov/terms#C200015" -> "C200015")
	let refId = classIdentifier;
	if (classIdentifier.includes('#')) {
		refId = classIdentifier.split('#').pop();
	} else if (classIdentifier.includes('/')) {
		refId = classIdentifier.split('/').pop();
	}
	
	// Look up the class in the loaded classes for current domain
	const classObj = ontologyStore.classes.find(c => 
		c.refId === refId || 
		c.name === refId ||
		c.uri === classIdentifier
	);
	
	if (classObj) {
		return classObj.label || classObj.prefLabel || classObj.name;
	}
	
	// If not found in current domain, try to get a friendly name from the refId
	// Common CEDS class patterns we can recognize
	const classNames = {
		'C200015': 'Course',
		'C200017': 'Course Section',
		'C200020': 'Course Offering',
		'C200023': 'Course Section Schedule',
		'C200226': 'Learner Activity',
		'C200239': 'Learning Resource',
		'C200275': 'Organization',
		'C000239': 'Person',
		'C002058': 'Student',
		'C002059': 'Staff',
		'C002408': 'Assessment'
	};
	
	// Return known name or formatted refId
	return classNames[refId] || `${refId} (Other Domain)`;
};

// Select a linked class
const selectLinkedClass = (classIdentifier) => {
	// Extract refId from URI if needed
	let refId = classIdentifier;
	if (classIdentifier && classIdentifier.includes('#')) {
		refId = classIdentifier.split('#').pop();
	} else if (classIdentifier && classIdentifier.includes('/')) {
		refId = classIdentifier.split('/').pop();
	}
	
	// Find the class object
	const classObj = ontologyStore.classes.find(c => 
		c.refId === refId || 
		c.name === refId ||
		c.uri === classIdentifier
	);
	
	if (classObj) {
		// Select the class (this will also update the URL)
		ontologyStore.selectClass(classObj);
	}
};

// Format confidence score
const confidencePercent = computed(() => {
	if (!props.classData.confidence) return null;
	return Math.round(props.classData.confidence * 100);
});
</script>

<template>
	<div class="class-details-wrapper">
		<!-- Header -->
		<div class="text-h5 mb-2">
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
		</div>
		
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
		<div class="text-subtitle-1 text-grey mb-3">
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
		</div>
		
		<!-- Description -->
		<div>
			<div class="text-body-1 mb-4">
				{{ classData.definition || parsedMetadata.comment || classData.description || 'No description available' }}
			</div>
			
			<!-- Metadata sections -->
			<div class="metadata-sections">
				<!-- Properties Summary -->
				<v-card variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-code-braces</v-icon>
						RDF Properties
						<v-chip size="small" class="ml-2">{{ propertyCount.total }}</v-chip>
					</v-card-title>
					<v-card-text class="pt-1">
						<div v-if="propertyCount.total > 0">
							<p class="text-body-2">
								This class has <strong>{{ propertyCount.total }}</strong> RDF relationships:
							</p>
							<ul class="text-body-2 ml-4">
								<li v-if="propertyCount.incoming > 0">
									{{ propertyCount.incoming }} incoming (other classes point to this)
								</li>
								<li v-if="propertyCount.outgoing > 0">
									{{ propertyCount.outgoing }} outgoing (this class points to others)
								</li>
							</ul>
						</div>
						<div v-else class="text-body-2">
							This class has metadata relationships only (type, label, notation, etc.)
						</div>
					</v-card-text>
				</v-card>
				
				<!-- RDF Context -->
				<v-card variant="outlined" class="mb-3">
					<v-card-title class="text-subtitle-1 py-2">
						<v-icon class="mr-2" size="small">mdi-semantic-web</v-icon>
						RDF Context & Semantic Web Linkages
					</v-card-title>
					<v-card-text class="pt-1">
						<!-- Basic RDF Metadata -->
						<v-table density="compact">
							<tbody>
								<tr v-if="classData.uri">
									<td class="font-weight-bold">URI (Subject)</td>
									<td>
										<a :href="classData.uri" target="_blank" class="text-decoration-none">
											{{ classData.uri }}
											<v-icon size="x-small" class="ml-1">mdi-open-in-new</v-icon>
										</a>
									</td>
								</tr>
								<tr v-if="classData.classType">
									<td class="font-weight-bold">RDF Type</td>
									<td class="text-mono">{{ classData.classType }}</td>
								</tr>
								<tr v-if="classData.notation">
									<td class="font-weight-bold">Notation</td>
									<td class="text-mono">{{ classData.notation }}</td>
								</tr>
								<tr v-if="classData.name">
									<td class="font-weight-bold">CEDS Code</td>
									<td class="text-mono">{{ classData.name }}</td>
								</tr>
								<tr v-if="classData.prefLabel">
									<td class="font-weight-bold">Preferred Label</td>
									<td>{{ classData.prefLabel }}</td>
								</tr>
								<tr v-if="classData.label && classData.label !== classData.prefLabel">
									<td class="font-weight-bold">Alternative Label</td>
									<td>{{ classData.label }}</td>
								</tr>
							</tbody>
						</v-table>
						
						<!-- Class Metadata Triples -->
						<div class="mt-4">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-tag-outline</v-icon>
								Class Metadata (RDF Triples)
							</div>
							<v-table density="compact" class="rdf-triples-table">
								<thead>
									<tr>
										<th class="text-left">Predicate</th>
										<th class="text-left">Object</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(triple, index) in rdfRelationships.metadata" :key="`meta-${index}`">
										<td>
											<div class="text-caption font-weight-medium">{{ triple.predicateLabel }}</div>
											<div class="text-mono text-caption text-grey">{{ triple.predicate }}</div>
										</td>
										<td>
											<div class="text-caption">
												{{ triple.object.split('#').pop() || triple.object }}
											</div>
										</td>
									</tr>
								</tbody>
							</v-table>
						</div>
						
						<!-- Incoming Relationships (where this class is the object/range) -->
						<div v-if="rdfRelationships.incoming.length > 0" class="mt-4">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-arrow-left-bold</v-icon>
								Incoming Relationships (Other Classes → This Class)
							</div>
							<v-table density="compact" class="rdf-triples-table">
								<thead>
									<tr>
										<th class="text-left">Subject (Source)</th>
										<th class="text-left">Predicate</th>
										<th class="text-left">Object (This Class)</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(triple, index) in rdfRelationships.incoming.slice(0, 10)" :key="`in-${index}`">
										<td>
											<a 
												@click.prevent="selectLinkedClass(triple.subject)"
												class="text-caption class-link"
												href="#"
											>
												{{ getClassName(triple.subject) }}
											</a>
										</td>
										<td>
											<div class="text-caption">{{ triple.predicateLabel }}</div>
											<div class="text-mono text-caption text-grey">{{ triple.predicate }}</div>
										</td>
										<td>
											<div class="text-caption text-primary">
												{{ classData.label || classData.name }}
											</div>
										</td>
									</tr>
								</tbody>
							</v-table>
							<div v-if="rdfRelationships.incoming.length > 10" class="text-caption text-grey mt-2">
								Showing 10 of {{ rdfRelationships.incoming.length }} incoming relationships
							</div>
						</div>
						
						<!-- Outgoing Relationships (where this class is the subject/domain) -->
						<div v-if="rdfRelationships.outgoing.length > 0" class="mt-4">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-arrow-right-bold</v-icon>
								Outgoing Relationships (This Class → Other Classes)
							</div>
							<v-table density="compact" class="rdf-triples-table">
								<thead>
									<tr>
										<th class="text-left">Subject (This Class)</th>
										<th class="text-left">Predicate</th>
										<th class="text-left">Object/Range</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="(triple, index) in rdfRelationships.outgoing.slice(0, 10)" :key="`out-${index}`">
										<td>
											<div class="text-caption text-primary">
												{{ classData.label || classData.name }}
											</div>
										</td>
										<td>
											<div class="text-caption">{{ triple.predicateLabel }}</div>
											<div class="text-mono text-caption text-grey">{{ triple.predicate }}</div>
										</td>
										<td>
											<a 
												v-if="triple.object && triple.object.includes('ceds.ed.gov/terms')"
												@click.prevent="selectLinkedClass(triple.object)"
												class="text-caption class-link"
												href="#"
											>
												{{ getClassName(triple.object) }}
											</a>
											<div v-else-if="triple.object" class="text-caption">
												{{ triple.object.split('#').pop() || triple.object }}
											</div>
											<div v-else class="text-caption text-grey">-</div>
										</td>
									</tr>
								</tbody>
							</v-table>
							<div v-if="rdfRelationships.outgoing.length > 10" class="text-caption text-grey mt-2">
								Showing 10 of {{ rdfRelationships.outgoing.length }} outgoing relationships
							</div>
						</div>
						
						<!-- Class Hierarchy -->
						<div v-if="parsedMetadata.superClasses?.length > 0" class="mt-4">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-sitemap</v-icon>
								Class Hierarchy
							</div>
							<v-chip-group>
								<v-chip
									v-for="(superClass, index) in parsedMetadata.superClasses"
									:key="index"
									size="small"
									variant="outlined"
									color="primary"
								>
									<v-icon size="x-small" start>mdi-chevron-up</v-icon>
									{{ superClass.split('#').pop() || superClass }}
								</v-chip>
							</v-chip-group>
						</div>
						
						<!-- Equivalent Classes -->
						<div v-if="parsedMetadata.equivalentClasses?.length > 0" class="mt-3">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-equal</v-icon>
								Equivalent Classes
							</div>
							<v-chip-group>
								<v-chip
									v-for="(equivClass, index) in parsedMetadata.equivalentClasses"
									:key="index"
									size="small"
									variant="outlined"
									color="secondary"
								>
									<v-icon size="x-small" start>mdi-approximately-equal</v-icon>
									{{ equivClass.split('#').pop() || equivClass }}
								</v-chip>
							</v-chip-group>
						</div>
						
						<!-- Property Summary -->
						<div v-if="classData.properties?.length > 0" class="mt-4">
							<div class="text-subtitle-2 font-weight-bold mb-2">
								<v-icon size="small" class="mr-1">mdi-link-variant</v-icon>
								Property Summary
							</div>
							<div class="text-body-2">
								This class has <strong>{{ classData.properties.length }}</strong> RDF properties defining its relationships and attributes.
							</div>
							<div class="text-body-2 mt-2 property-names-list">
								{{ classData.properties.map(p => p.label || p.comment || p.name).join(', ') }}
							</div>
						</div>
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
		</div>
	</div>
</template>

<style scoped>
.class-details-wrapper {
	padding: 12px;
}

.text-mono {
	font-family: 'Courier New', Courier, monospace;
}

.metadata-sections .v-card-title {
	background-color: rgba(0, 0, 0, 0.02);
	font-weight: 500;
}

.rdf-triples-table {
	background-color: rgba(0, 0, 0, 0.01);
}

.rdf-triples-table th {
	background-color: rgba(0, 0, 0, 0.03) !important;
	font-weight: 600 !important;
}

.property-names-list {
	color: rgba(0, 0, 0, 0.7);
	line-height: 1.6;
	word-wrap: break-word;
}

.class-link {
	color: #1976d2;
	text-decoration: none;
	cursor: pointer;
}

.class-link:hover {
	text-decoration: underline;
}
</style>