// snippetManager.js
// Handles save / load / delete of per-domain CSS snippets in chrome.storage.sync

class SnippetManager {
    static STORAGE_KEY = 'ws_snippets';
  
    /** return { snippetName: css, … } for a domain (or empty object) */
    static async getAll(domain) {
      const res = await chrome.storage.sync.get(this.STORAGE_KEY);
      return (res[this.STORAGE_KEY]?.[domain]) || {};
    }
  
    /** save (or overwrite) one snippet, and return updated map */
    static async save(domain, name, css) {
      const res   = await chrome.storage.sync.get(this.STORAGE_KEY);
      const store = res[this.STORAGE_KEY] || {};
      store[domain]           = store[domain] || {};
      store[domain][name]     = css;
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: store });
      return store[domain];
    }
  
    /** delete a snippet by name; no-op if it doesn’t exist */
    static async delete(domain, name) {
      const res   = await chrome.storage.sync.get(this.STORAGE_KEY);
      const store = res[this.STORAGE_KEY] || {};
      if (store[domain]) {
        delete store[domain][name];
        await chrome.storage.sync.set({ [this.STORAGE_KEY]: store });
      }
    }
  
    /** export ALL snippets as prettified JSON */
    static async exportJSON() {
      const res = await chrome.storage.sync.get(this.STORAGE_KEY);
      return JSON.stringify(res[this.STORAGE_KEY] || {}, null, 2);
    }
  
    /** completely replace existing storage with JSON string */
    static async importJSON(json) {
      let parsed;
      try { parsed = JSON.parse(json); }
      catch { throw new Error('Invalid JSON'); }
      await chrome.storage.sync.set({ [this.STORAGE_KEY]: parsed });
    }
  }
  
  // expose to popup.js and content.js
  window.SnippetManager = SnippetManager;
  
