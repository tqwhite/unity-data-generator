import { defineStore } from 'pinia';

export const useNamodelStore = defineStore('namodel', {
  state: () => ({
    nameList: [],
    currentData: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchNameList() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await fetch('/api/namodel/fetchNameList');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch NA Model name list: ${response.statusText}`);
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
      
      this.isLoading = true;
      this.error = null;
      try {
        const response = await fetch(`/api/namodel/fetchData?refId=${encodeURIComponent(refId)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch NA Model data: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData = data;
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
      
      this.isLoading = true;
      this.error = null;
      try {
        const response = await fetch('/api/namodel/saveData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save NA Model data: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        this.currentData = responseData;
        
        // Update name in the nameList if it exists
        const nameIndex = this.nameList.findIndex(item => item.refId === data.refId);
        if (nameIndex !== -1) {
          this.nameList[nameIndex] = { 
            refId: data.refId, 
            name: data.name || data.title || data.refId 
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
      this.currentData = null;
    }
  },
  
  getters: {
    isDataLoaded: (state) => !!state.currentData,
    hasNameList: (state) => state.nameList.length > 0,
  }
});