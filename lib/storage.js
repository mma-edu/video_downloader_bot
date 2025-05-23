const fs = require('fs');
const path = require('path');

// In-memory storage (persists between Lambda invocations)
const storage = {
  _files: {},
  _filePath: '/tmp/download_tracker.json',

  init() {
    try {
      if (fs.existsSync(this._filePath)) {
        this._files = JSON.parse(fs.readFileSync(this._filePath));
      }
    } catch (error) {
      console.error('Storage init error:', error);
    }
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Hourly cleanup
  },

  trackFile(chatId, filePath) {
    const id = `${chatId}_${Date.now()}`;
    this._files[id] = { path: filePath, timestamp: Date.now() };
    this._persist();
    return id;
  },

  cleanup() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    Object.entries(this._files).forEach(([id, file]) => {
      if (now - file.timestamp > oneHour) {
        try {
          if (fs.existsSync(file.path)) {
            fs.rmSync(file.path, { recursive: true, force: true });
          }
          delete this._files[id];
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    });
    this._persist();
  },

  _persist() {
    try {
      fs.writeFileSync(this._filePath, JSON.stringify(this._files));
    } catch (error) {
      console.error('Storage persist error:', error);
    }
  }
};

storage.init();
module.exports = storage;