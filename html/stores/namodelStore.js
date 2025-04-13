import { defineStore } from 'pinia';
import { qtPutSurePath } from '@/plugins/qtools-functional-library';

export const useNamodelStore = defineStore('namodel', {
	state: () => ({
		nameList: [],
		listOfProperties: null,
		combinedObject: null,
		isLoading: false,
		error: null,
		isLoadingSemanticDistance: false,
		semanticDistanceError: null,
		semanticDistanceResults: {},
		votingStatus: {
			isVoting: false,
			error: null,
			voteCounts: {}
		},
		evaluationPreferences: {
			sortBy: {
				key: 'cedsMatchesConfidence',
				order: 'desc'
			}
		}
	}),

	actions: {
		async fetchNameList() {
			this.isLoading = true;
			this.error = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			try {
				const response = await fetch('/api/namodel/fetchNameList', {
					headers: authHeader,
				});

				if (!response.ok) {
					throw new Error(
						`Failed to fetch NA Model name list: ${response.statusText}`,
					);
				}

				const data = await response.json();
				this.nameList = data;
			} catch (err) {
				this.error = err.message;
				console.error('Error fetching NA Model name list:', err);
			} finally {
				this.isLoading = false;
			}
		},

		async fetchData(refId) {
			if (!refId) {
				console.error('No refId provided to fetchData');
				return;
			}

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch(
					`/api/namodel/fetchData?refId=${encodeURIComponent(refId)}`,
					{
						headers: authHeader,
					},
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch NA Model data: ${response.statusText}`);
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
				console.error('Error fetching NA Model data:', err);
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

			// Get the auth token header
			const authHeader = LoginStore.getAuthTokenProperty;

			this.isLoading = true;
			this.error = null;
			try {
				const response = await fetch('/api/namodel/saveData', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(data),
				});

				if (!response.ok) {
					throw new Error(`Failed to save NA Model data: ${response.statusText}`);
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
				console.error('Error saving NA Model data:', err);
				throw err;
			} finally {
				this.isLoading = false;
			}
		},

		clearCurrentData() {
			this.listOfProperties = null;
			this.combinedObject = null;
		},

		async fetchSemanticDistance(refId, queryString = 'family name') {
			this.isLoadingSemanticDistance = true;
			this.semanticDistanceError = null;

			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();

			// Get the auth token header if user is logged in, otherwise empty object
			// CEDS endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};

			// Check if queryString contains both description and XPath
			const parts = queryString.split(' ');
			let description = '';
			let xpath = '';

			// If queryString has XPath (has slashes), split it into description and xpath
			if (queryString.includes('/')) {
				// Find the index where XPath starts (first word with a slash)
				const xpathStartIndex = parts.findIndex(part => part.includes('/'));
				
				if (xpathStartIndex !== -1) {
					description = parts.slice(0, xpathStartIndex).join(' ');
					xpath = parts.slice(xpathStartIndex).join(' ');
				}
			} else {
				// If no XPath detected, use the whole string as description
				description = queryString;
			}

			// Process XPath to make it more searchable
			let processedXPath = '';
			if (xpath) {
				// Extract meaningful parts from XPath, replace slashes with spaces
				processedXPath = xpath
					.replace(/\//g, ' ')
					.replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
					.replace(/\s+/g, ' ') // Normalize spaces
					.trim();
			}

			// Combine description with processed XPath
			const processedQueryString = [description, processedXPath].filter(Boolean).join(' ').trim();

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

				// Store the response in our state, keyed by refId for this specific query
				const resultItem = {
					queryString: processedQueryString,
					originalQuery: queryString,
					timestamp: new Date().toISOString(),
					resultSet: data,
				};

				// Initialize array for this refId if it doesn't exist
				if (!this.semanticDistanceResults[refId]) {
					this.semanticDistanceResults[refId] = [];
				}

				// Add new result
				this.semanticDistanceResults[refId].push(resultItem);

				// Limit to last 5 queries per refId
				if (this.semanticDistanceResults[refId].length > 5) {
					this.semanticDistanceResults[refId] = this.semanticDistanceResults[refId].slice(-5);
				}

				return data;
			} catch (err) {
				this.semanticDistanceError = err.message;
				console.error('Error fetching semantic distance data:', err);
			} finally {
				this.isLoadingSemanticDistance = false;
			}
		},
		
		// Get semantic distance results for a specific entity
		getSemanticDistanceResults(refId) {
			return this.semanticDistanceResults[refId] || [];
		},
		
		// Send vote for CEDS match approval/rejection
		async sendCedsMatchVote(unityCedsMatchesRefId, isGoodMatch) {
			this.votingStatus.isVoting = true;
			this.votingStatus.error = null;
			
			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();
			
			// Get the auth token header if user is logged in, otherwise empty object
			// unityCedsVote endpoints are marked as public so we don't need a token
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};
			
			try {
				// Create vote data
				const voteData = {
					unityCedsMatchesRefId,
					isGoodMatch: isGoodMatch ? '1' : '0',
					username: LoginStore.validUser ? LoginStore.userData.username : 'anonymous'
				};
				
				const response = await fetch('/api/unityCedsVote/saveVote', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(voteData),
				});
				
				if (!response.ok) {
					throw new Error(`Failed to save vote: ${response.statusText}`);
				}
				
				const voteResult = await response.json();
				
				// Store the vote counts for this match
				if (voteResult.goodCount !== undefined || voteResult.badCount !== undefined) {
					this.votingStatus.voteCounts[unityCedsMatchesRefId] = {
						goodCount: voteResult.goodCount || 0,
						badCount: voteResult.badCount || 0,
						lastVote: isGoodMatch ? 'good' : 'bad',
						voteRefId: voteResult.refId // Store the vote refId for undo
					};
				}
				
				return voteResult;
			} catch (err) {
				this.votingStatus.error = err.message;
				console.error('Error sending CEDS match vote:', err);
				throw err;
			} finally {
				this.votingStatus.isVoting = false;
			}
		},
		
		// Undo a previously cast vote
		async undoCedsMatchVote(voteRefId, unityCedsMatchesRefId) {
			this.votingStatus.isVoting = true;
			this.votingStatus.error = null;
			
			// Import LoginStore to get auth token
			const { useLoginStore } = await import('@/stores/loginStore');
			const LoginStore = useLoginStore();
			
			// Get the auth token header if user is logged in, otherwise empty object
			const authHeader = LoginStore.validUser ? LoginStore.getAuthTokenProperty : {};
			
			try {
				// Create undo data object with the vote refId
				const undoData = {
					refId: voteRefId,
					unityCedsMatchesRefId // Pass this to get updated counts after deletion
				};
				
				const response = await fetch('/api/unityCedsVote/undoVote', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...authHeader,
					},
					body: JSON.stringify(undoData),
				});
				
				if (!response.ok) {
					throw new Error(`Failed to undo vote: ${response.statusText}`);
				}
				
				const undoResult = await response.json();
				
				// Update the vote counts for this match in the store
				if (unityCedsMatchesRefId) {
					this.votingStatus.voteCounts[unityCedsMatchesRefId] = {
						goodCount: undoResult.goodCount || 0,
						badCount: undoResult.badCount || 0,
						lastVote: null,
						voteRefId: null
					};
				}
				
				return undoResult;
			} catch (err) {
				this.votingStatus.error = err.message;
				console.error('Error undoing CEDS match vote:', err);
				throw err;
			} finally {
				this.votingStatus.isVoting = false;
			}
		},
		
		// Set sort preferences for evaluation tool
		setEvaluationSortPreference(key, order) {
			this.evaluationPreferences.sortBy = {
				key: key || 'cedsMatchesConfidence',
				order: order || 'desc'
			};
		},
	},

	getters: {
		isDataLoaded: (state) => !!state.listOfProperties,
		hasNameList: (state) => state.nameList.length > 0,
		
		// Get the total number of elements in the current object
		totalElementCount: (state) => {
			if (!state.combinedObject) return 0;
			return Object.keys(state.combinedObject).length;
		},
		
		// Get the number of elements with CEDS matches
		cedsMatchCount: (state) => {
			if (!state.combinedObject) return 0;
			
			// Count only items that have cedsMatchesConfidence
			return Object.values(state.combinedObject).filter(item => 
				item && item.cedsMatchesConfidence !== undefined && item.cedsMatchesConfidence !== null
			).length;
		},
		
		// Get vote counts for a specific CEDS match
		getVoteCounts: (state) => (matchRefId) => {
			return state.votingStatus.voteCounts[matchRefId] || { goodCount: 0, badCount: 0 };
		},
	},
	
});