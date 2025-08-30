import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useOntologyStore = defineStore('ontology', () => {
	// State
	const domains = ref([]);
	const currentDomain = ref(null);
	const functionalAreas = ref([]);
	const classes = ref([]);
	const selectedClass = ref(null);
	const selectedClassId = ref(null);
	const selectedDomainId = ref(null);
	const searchScope = ref('domain'); // 'domain' or 'global'
	const lastViewedByDomain = ref({});
	const isLoading = ref(false);
	const error = ref(null);
	
	// Cache for loaded data to avoid repeated API calls
	const domainDataCache = ref({});

	// Auth header helper
	const getAuthHeader = async () => {
		const { useLoginStore } = await import('@/stores/loginStore');
		const LoginStore = useLoginStore();
		return LoginStore.getAuthTokenProperty;
	};

	// Actions
	const loadDomains = async () => {
		isLoading.value = true;
		error.value = null;
		try {
			const authHeader = await getAuthHeader();
			const response = await fetch('/api/ceds/fetchDomains', {
				headers: authHeader
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			domains.value = data.sort((a, b) => a.displayOrder - b.displayOrder);
			
			// Set initial domain if none selected
			if (!currentDomain.value && domains.value.length > 0) {
				currentDomain.value = domains.value[0];
			}
		} catch (err) {
			error.value = err.message;
			console.error('Error loading domains:', err);
		} finally {
			isLoading.value = false;
		}
	};

	const loadFunctionalAreas = async (domainRefId) => {
		isLoading.value = true;
		error.value = null;
		try {
			// Use the new entity lookup system from cedsStore
			const { useCedsStore } = await import('@/stores/cedsStore');
			const cedsStore = useCedsStore();
			
			// Fetch functional areas with counts using the new endpoint
			const data = await cedsStore.fetchFunctionalAreasCounts(domainRefId);
			functionalAreas.value = data || [];
		} catch (err) {
			error.value = err.message;
			console.error('Error loading functional areas:', err);
			functionalAreas.value = [];
		} finally {
			isLoading.value = false;
		}
	};

	const loadClasses = async (domainRefId, functionalAreaRefId = null) => {
		console.log('Loading classes for domain:', domainRefId); // Debug log
		isLoading.value = true;
		error.value = null;
		try {
			// Use the new entity lookup system from cedsStore
			const { useCedsStore } = await import('@/stores/cedsStore');
			const cedsStore = useCedsStore();
			
			// Fetch entities by domain (includes classes and functional areas)
			const entities = await cedsStore.fetchEntityLookup(domainRefId);
			
			// Filter to get just classes
			let classEntities = entities.filter(e => e.entityType === 'class');
			
			// If functional area specified, filter by that
			if (functionalAreaRefId) {
				classEntities = classEntities.filter(c => c.functionalAreaRefId === functionalAreaRefId);
			}
			
			console.log('Loaded classes:', classEntities.length); // Debug log
			
			// Transform to match expected format
			classes.value = classEntities.map(c => ({
				refId: c.refId,
				name: c.code || c.refId,
				label: c.label,
				prefLabel: c.prefLabel,
				description: c.notation || '',
				functionalAreaRefId: c.functionalAreaRefId,
				domainRefId: c.domainRefId,
				isOptionSet: c.isOptionSet,
				// crossDomainList is already an array from the API
				otherDomains: Array.isArray(c.crossDomainList) 
					? c.crossDomainList.filter(d => d !== domainRefId)
					: []
			}));
		} catch (err) {
			error.value = err.message;
			console.error('Error loading classes:', err);
			classes.value = []; // Ensure empty array on error
		} finally {
			isLoading.value = false;
		}
	};

	const selectDomain = async (domain) => {
		console.log('Selecting domain:', domain.domainName); // Debug log
		currentDomain.value = domain;
		
		// Check cache first
		if (domainDataCache.value[domain.refId]) {
			console.log('Using cached data for domain:', domain.domainName);
			const cached = domainDataCache.value[domain.refId];
			functionalAreas.value = cached.functionalAreas;
			classes.value = cached.classes;
		} else {
			console.log('Loading fresh data for domain:', domain.domainName);
			// Load data for the domain
			await loadFunctionalAreas(domain.refId);
			await loadClasses(domain.refId);
			
			// Cache the loaded data
			domainDataCache.value[domain.refId] = {
				functionalAreas: functionalAreas.value,
				classes: classes.value,
				timestamp: Date.now()
			};
		}
		
		// Restore last viewed class for this domain if exists
		if (lastViewedByDomain.value[domain.refId]) {
			const classRefId = lastViewedByDomain.value[domain.refId];
			selectedClass.value = classes.value.find(c => c.refId === classRefId);
		} else {
			selectedClass.value = null;
		}
	};

	const selectClass = (classObj) => {
		console.log('Selecting class:', classObj); // Debug log
		selectedClass.value = classObj;
		if (currentDomain.value && classObj) {
			lastViewedByDomain.value[currentDomain.value.refId] = classObj.refId;
			// Persist to localStorage
			persistLastViewed();
		}
	};

	const searchClasses = async (searchTerm) => {
		// This would call a search endpoint - to be implemented
		console.log('Search not yet implemented:', searchTerm, searchScope.value);
	};
	
	// Get all domains that contain a specific class
	const getClassDomains = async (classId) => {
		try {
			const authHeader = await getAuthHeader();
			const response = await fetch(`/api/ceds/getClassDomains/${classId}`, {
				headers: authHeader
			});
			
			if (!response.ok) {
				// If endpoint doesn't exist, return mock data for now
				console.warn('getClassDomains endpoint not yet implemented, returning mock data');
				// Return all domains as a fallback
				return domains.value || [];
			}
			
			const data = await response.json();
			return data;
		} catch (err) {
			console.error('Error fetching class domains:', err);
			// Return all domains as a fallback
			return domains.value || [];
		}
	};
	
	// Select domain by ID (for deep linking)
	const selectDomainById = async (domainId) => {
		// Ensure domains are loaded
		if (domains.value.length === 0) {
			await loadDomains();
		}
		
		const domain = domains.value.find(d => d.refId === domainId);
		if (domain) {
			await selectDomain(domain);
		}
	};

	const persistLastViewed = () => {
		// Only access localStorage on client side
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				localStorage.setItem('ontology-last-viewed', JSON.stringify(lastViewedByDomain.value));
			} catch (e) {
				console.error('Failed to persist last viewed:', e);
			}
		}
	};

	const loadPersistedState = () => {
		// Only access localStorage on client side
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				const stored = localStorage.getItem('ontology-last-viewed');
				if (stored) {
					lastViewedByDomain.value = JSON.parse(stored);
				}
			} catch (e) {
				console.error('Failed to load persisted state:', e);
			}
		}
	};

	// Export functions for different formats
	const exportData = (format = 'json') => {
		const exportData = {
			domain: currentDomain.value,
			functionalAreas: functionalAreas.value,
			classes: classes.value
		};

		switch (format) {
			case 'json':
				return JSON.stringify(exportData, null, 2);
			case 'csv':
				// Convert to CSV format
				const csvRows = ['Class Name,Domain,Description,Other Domains'];
				classes.value.forEach(cls => {
					const otherDomains = cls.otherDomains ? cls.otherDomains.join('; ') : '';
					const className = cls.name || cls.label || 'Unnamed';
					const description = cls.definition || cls.description || '';
					csvRows.push(`"${className}","${currentDomain.value.domainName}","${description}","${otherDomains}"`);
				});
				return csvRows.join('\n');
			case 'rdf':
				// RDF export would be more complex
				console.log('RDF export not yet implemented');
				return null;
			default:
				return null;
		}
	};

	// Computed
	const classCount = computed(() => classes.value.length);
	const hasMultiDomainClasses = computed(() => 
		classes.value.some(c => c.otherDomains && c.otherDomains.length > 0)
	);

	// Clear cache for a specific domain or all domains
	const clearCache = (domainRefId = null) => {
		if (domainRefId) {
			delete domainDataCache.value[domainRefId];
			console.log('Cleared cache for domain:', domainRefId);
		} else {
			domainDataCache.value = {};
			console.log('Cleared all domain cache');
		}
	};

	// Initialize persisted state
	loadPersistedState();

	return {
		// State
		domains,
		currentDomain,
		functionalAreas,
		classes,
		selectedClass,
		selectedClassId,
		selectedDomainId,
		searchScope,
		lastViewedByDomain,
		isLoading,
		error,
		
		// Computed
		classCount,
		hasMultiDomainClasses,
		
		// Actions
		loadDomains,
		loadFunctionalAreas,
		loadClasses,
		selectDomain,
		selectDomainById,
		selectClass,
		searchClasses,
		getClassDomains,
		exportData,
		persistLastViewed,
		loadPersistedState,
		clearCache
	};
});