import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useOntologyStore = defineStore('ontology', () => {
	// State
	const domains = ref([]);
	const currentDomain = ref(null);
	const functionalAreas = ref([]);
	const classes = ref([]);
	const selectedClass = ref(null);
	const searchScope = ref('domain'); // 'domain' or 'global'
	const lastViewedByDomain = ref({});
	const isLoading = ref(false);
	const error = ref(null);

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
			const authHeader = await getAuthHeader();
			const response = await fetch(`/api/ceds/fetchFunctionalAreas?domainRefId=${domainRefId}`, {
				headers: authHeader
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			functionalAreas.value = data;
		} catch (err) {
			error.value = err.message;
			console.error('Error loading functional areas:', err);
		} finally {
			isLoading.value = false;
		}
	};

	const loadClasses = async (domainRefId, functionalAreaRefId = null) => {
		isLoading.value = true;
		error.value = null;
		try {
			const authHeader = await getAuthHeader();
			let url = `/api/ceds/fetchClassesByCategory?domainRefId=${domainRefId}&includeProperties=true`;
			if (functionalAreaRefId) {
				url += `&functionalAreaRefId=${functionalAreaRefId}`;
			}
			
			const response = await fetch(url, {
				headers: authHeader
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			classes.value = data;
		} catch (err) {
			error.value = err.message;
			console.error('Error loading classes:', err);
		} finally {
			isLoading.value = false;
		}
	};

	const selectDomain = async (domain) => {
		currentDomain.value = domain;
		await loadFunctionalAreas(domain.refId);
		await loadClasses(domain.refId);
		
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

	const persistLastViewed = () => {
		try {
			localStorage.setItem('ontology-last-viewed', JSON.stringify(lastViewedByDomain.value));
		} catch (e) {
			console.error('Failed to persist last viewed:', e);
		}
	};

	const loadPersistedState = () => {
		try {
			const stored = localStorage.getItem('ontology-last-viewed');
			if (stored) {
				lastViewedByDomain.value = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load persisted state:', e);
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

	// Initialize persisted state
	loadPersistedState();

	return {
		// State
		domains,
		currentDomain,
		functionalAreas,
		classes,
		selectedClass,
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
		selectClass,
		searchClasses,
		exportData,
		persistLastViewed,
		loadPersistedState
	};
});