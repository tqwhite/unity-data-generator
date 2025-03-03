import { defineStore } from 'pinia';

export const useCedsStore = defineStore('ceds', {
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
        const response = await fetch('/api/ceds/fetchNameList');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CEDS name list: ${response.statusText}`);
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

    async fetchData(refId) {
      if (!refId) {
        console.error('No refId provided to fetchData');
        return;
      }
      
      this.isLoading = true;
      this.error = null;
      try {
        const response = await fetch(`/api/ceds/fetchData?refId=${encodeURIComponent(refId)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CEDS data: ${response.statusText}`);
        }
        
        const data = await response.json();
        this.currentData = data;
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
      
      this.isLoading = true;
      this.error = null;
      try {
        const response = await fetch('/api/ceds/saveData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to save CEDS data: ${response.statusText}`);
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
        console.error('Error saving CEDS data:', err);
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