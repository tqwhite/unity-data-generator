import { defineStore } from 'pinia';
import { toType, qtPutSurePath } from '@/plugins/qtools-functional-library';

export const useCedsStore = defineStore('ceds', {
	state: () => ({
		nameList: [],
		listOfProperties: null,
		combinedObject: null,
		isLoading: false,
		error: null,
		isLoadingSemanticDistance: false,
		semanticDistanceError: null,
		semanticDistanceResults: {},
		ontologyClasses: null,
		isLoadingOntologyClasses: false,
		ontologyClassesError: null,
		// Entity lookup for three-tier navigation
		entityLookupCache: {},
		entityDetailsCache: {},
		functionalAreasCache: {},
		isLoadingEntityLookup: false,
		entityLookupError: null,
	}),

	actions: {
		async fetchNameList() {
			this.isLoading = true;
			this.error = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch('/api/ceds/fetchNameList', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch CEDS name list: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.nameList = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching CEDS name list:', err);
			} finally {
				this.isLoading = false;
			}
		},

		async fetchData(refId, options = {}) {
			if (!refId) {
				console.error('No refId provided to fetchData');
				return;
			}
			
			const { semanticAnalysisMode, semanticAnalyzerVersion } = options;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			this.isLoading = true;
			this.error = null;
			try {
				// Build URL with optional semantic analysis parameters
				let url = `/api/ceds/fetchData?refId=${encodeURIComponent(refId)}`;
				if (semanticAnalysisMode) {
					url += `&semanticAnalysisMode=${encodeURIComponent(semanticAnalysisMode)}`;
				}
				if (semanticAnalyzerVersion) {
					url += `&semanticAnalyzerVersion=${encodeURIComponent(semanticAnalyzerVersion)}`;
				}
				
				const response = await fetch(url, {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch CEDS data: ${response.statusText}`);
				}

				const data = await response.json();

				// Create the structured object from the flat list of properties
				const listOfProperties = [];
				Object.keys(data).map((name) => {
					listOfProperties.push(data[name]);
				});

				// Store both representations for different use cases
				this.listOfProperties = listOfProperties;
				this.combinedObject = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching CEDS data:', err);
			} finally {
				this.isLoading = false;
			}
		},

		async saveData(data) {
			if (!data || !data.refId) {
				console.error('Invalid data or missing refId');
				return;
			}

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// For save operations, we require authentication - this is not public
			if (!LoginStore.validUser) {
				this.error = "Authentication required for saving data";
				console.error('Authentication required for saving data');
				return;
			}

			// Get the auth token property - this should include the token since we've verified validUser
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch('/api/ceds/saveData', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					throw new Error(`Failed to save CEDS data: ${response.statusText}`);
				}

				const responseData = await response.json();

				// Create the structured object from the flat list of properties
				const structuredObject = {};
				responseData.map((item) => {
					const path =
						item.XPath || item.path || `element.${item.id || item.name}`;
					qtPutSurePath(structuredObject, path.replace(/\//g, '.'), item);
				});

				// Store both representations
				this.listOfProperties = responseData;
				this.combinedObject = structuredObject;

				// Update name in the nameList if it exists
				const nameIndex = this.nameList.findIndex(
					(item) => item.refId === data.refId,
				);
				if (nameIndex !== -1) {
					this.nameList[nameIndex] = {
						refId: data.refId,
						name: data.name || data.title || data.refId,
					};
				}

				return responseData;
			} catch (err) {
				this.error = err.message;
				console.error('Error saving CEDS data:', err);
				throw err;
			} finally {
				this.isLoading = false;
			}
		},

		clearCurrentData() {
			this.listOfProperties = null;
			this.combinedObject = null;
		},
		
		async fetchSemanticDistance(searchId, queryString) {
			this.isLoadingSemanticDistance = true;
			this.semanticDistanceError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			// Process the query string for better search results
			const processedQueryString = queryString.trim();

			try {
				const response = await fetch(
					`/api/ceds/semanticDistance?queryString=${encodeURIComponent(processedQueryString)}`,
					{
						headers: authHeader,
					},
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch semantic distance data: ${response.statusText}`,
					);
				}

				const data = await response.json();

				// Store the response in our state, keyed by searchId for this specific query
				const resultItem = {
					queryString: processedQueryString,
					originalQuery: queryString,
					timestamp: new Date().toISOString(),
					resultSet: data,
				};

				// Initialize array for this searchId if it doesn't exist
				if (!this.semanticDistanceResults[searchId]) {
					this.semanticDistanceResults[searchId] = [];
				}

				// Add new result
				this.semanticDistanceResults[searchId].push(resultItem);

				// Limit to last 5 queries per searchId
				if (this.semanticDistanceResults[searchId].length > 5) {
					this.semanticDistanceResults[searchId] = this.semanticDistanceResults[searchId].slice(-5);
				}

				return data;
			} catch (err) {
				this.semanticDistanceError = err.message;
				console.error('Error fetching semantic distance data:', err);
			} finally {
				this.isLoadingSemanticDistance = false;
			}
		},
		
		// Get semantic distance results for a specific search ID
		getSemanticDistanceResults(searchId) {
			return this.semanticDistanceResults[searchId] || [];
		},
		
		// Fetch CEDS ontology classes from the server
		async fetchOntologyClasses() {
			this.isLoadingOntologyClasses = true;
			this.ontologyClassesError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch('/api/ceds/fetchOntologyClasses', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch CEDS ontology classes: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.ontologyClasses = data;
				return data;
			} catch (err) {
				this.ontologyClassesError = err.message;
				console.error('Error fetching CEDS ontology classes:', err);
			} finally {
				this.isLoadingOntologyClasses = false;
			}
		},

		// ================================================================================
		// ENTITY LOOKUP METHODS FOR THREE-TIER NAVIGATION
		
		// Fetch all entities or entities by domain for navigation
		async fetchEntityLookup(domainRefId = null) {
			const cacheKey = domainRefId || 'all';
			
			// Return cached data if available
			if (this.entityLookupCache[cacheKey]) {
				return this.entityLookupCache[cacheKey];
			}
			
			this.isLoadingEntityLookup = true;
			this.entityLookupError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				let url = '/api/ceds/fetchEntityLookup';
				if (domainRefId) {
					url += `?domain=${encodeURIComponent(domainRefId)}`;
				}
				
				const response = await fetch(url, {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch entity lookup data: ${response.statusText}`,
					);
				}

				const data = await response.json();
				
				// Cache the result
				this.entityLookupCache[cacheKey] = data;
				
				return data;
			} catch (err) {
				this.entityLookupError = err.message;
				console.error('Error fetching entity lookup data:', err);
				throw err;
			} finally {
				this.isLoadingEntityLookup = false;
			}
		},
		
		// Fetch details for a specific entity by refId
		async fetchEntityDetails(refId) {
			if (!refId) {
				console.error('No refId provided to fetchEntityDetails');
				return null;
			}
			
			// Return cached data if available
			if (this.entityDetailsCache[refId]) {
				return this.entityDetailsCache[refId];
			}
			
			this.isLoadingEntityLookup = true;
			this.entityLookupError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch(
					`/api/ceds/fetchEntityDetails/${encodeURIComponent(refId)}`,
					{
						headers: authHeader,
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch entity details: ${response.statusText}`,
					);
				}

				const data = await response.json();
				
				// Cache the result
				if (data) {
					this.entityDetailsCache[refId] = data;
				}
				
				return data;
			} catch (err) {
				this.entityLookupError = err.message;
				console.error('Error fetching entity details:', err);
				throw err;
			} finally {
				this.isLoadingEntityLookup = false;
			}
		},
		
		// Fetch functional areas with counts for a domain
		async fetchFunctionalAreasCounts(domainRefId) {
			if (!domainRefId) {
				console.error('No domainRefId provided to fetchFunctionalAreasCounts');
				return [];
			}
			
			// Return cached data if available
			if (this.functionalAreasCache[domainRefId]) {
				return this.functionalAreasCache[domainRefId];
			}
			
			this.isLoadingEntityLookup = true;
			this.entityLookupError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			try {
				const response = await fetch(
					`/api/ceds/fetchFunctionalAreasCounts/${encodeURIComponent(domainRefId)}`,
					{
						headers: authHeader,
					}
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch functional areas: ${response.statusText}`,
					);
				}

				const data = await response.json();
				
				// Cache the result
				this.functionalAreasCache[domainRefId] = data;
				
				return data;
			} catch (err) {
				this.entityLookupError = err.message;
				console.error('Error fetching functional areas:', err);
				throw err;
			} finally {
				this.isLoadingEntityLookup = false;
			}
		},
		
		// Clear entity lookup caches
		clearEntityLookupCache() {
			this.entityLookupCache = {};
			this.entityDetailsCache = {};
			this.functionalAreasCache = {};
		},
		
		// Resolve a refId to its label using cached data
		resolveEntityLabel(refId) {
			// Check details cache first
			if (this.entityDetailsCache[refId]) {
				return this.entityDetailsCache[refId].label || this.entityDetailsCache[refId].code || refId;
			}
			
			// Check all cached entity lookups
			for (const key in this.entityLookupCache) {
				const entities = this.entityLookupCache[key];
				const entity = entities.find(e => e.refId === refId);
				if (entity) {
					return entity.label || entity.code || refId;
				}
			}
			
			// Return the refId if no label found
			return refId;
		},
	},

	getters: {
		isDataLoaded: (state) => !!state.listOfProperties,
		hasNameList: (state) => state.nameList.length > 0,
		hasOntologyClasses: (state) => !!state.ontologyClasses,
		// Entity lookup getters
		hasEntityLookupData: (state) => Object.keys(state.entityLookupCache).length > 0,
		getCachedDomains: (state) => {
			// Extract unique domains from all cached entity lookups
			const domains = new Set();
			Object.values(state.entityLookupCache).forEach(entities => {
				entities
					.filter(e => e.entityType === 'domain')
					.forEach(d => domains.add(JSON.stringify({refId: d.refId, label: d.label})));
			});
			return Array.from(domains).map(d => JSON.parse(d));
		},
	},
});