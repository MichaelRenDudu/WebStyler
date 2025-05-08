// profileManager.js

class ProfileManager {
    static STORAGE_KEY = 'ws_profiles';
  
    /** Fetch the entire { domain: { profileName: data… } } map */
    static async getProfiles() {
      const res = await chrome.storage.sync.get(this.STORAGE_KEY);
      return res[this.STORAGE_KEY] || {};
    }
  
    /** Overwrite the entire profiles map */
    static async saveProfiles(profiles) {
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: profiles });
    }
  
    /** Get only the profiles object for one domain */
    static async getDomainProfiles(domain) {
      const all = await this.getProfiles();
      return all[domain] || {};
    }
  
    /**
     * Save or overwrite one named profile under a domain,
     * and record it as the "_lastUsed" for auto-apply.
     */
    static async saveDomainProfile(domain, name, data) {
      const all = await this.getProfiles();
      all[domain] = all[domain] || {};
      all[domain][name] = data;
      all[domain]._lastUsed = name;
      await this.saveProfiles(all);
    }
  
    /** Lookup the last-used profile name for a domain (or null) */
    static async getLastUsedProfile(domain) {
      const all = await this.getProfiles();
      return all[domain]?._lastUsed || null;
    }
  
    /** Export all profiles as a JSON string (for download / sharing) */
    static async exportJSON() {
      const all = await this.getProfiles();
      return JSON.stringify(all, null, 2);
    }
  
    /**
     * Import profiles from a JSON string.
     * This will completely replace whatever is in storage.
     */
    static async importJSON(jsonString) {
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
      await this.saveProfiles(parsed);
    }
  }
  
  // Expose globally so popup.js / content.js can call it:
  window.ProfileManager = ProfileManager;
  
