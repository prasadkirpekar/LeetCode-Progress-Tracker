// IndexedDB wrapper for LeetCode Progress Tracker
const DB_NAME = 'leetcode-tracker';
const DB_VERSION = 1;

let db = null;

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create problems store
      if (!database.objectStoreNames.contains('problems')) {
        const problemsStore = database.createObjectStore('problems', { keyPath: 'slug' });
        problemsStore.createIndex('difficulty', 'difficulty', { unique: false });
        problemsStore.createIndex('solved', 'solved', { unique: false });
        problemsStore.createIndex('firstAttempt', 'firstAttempt', { unique: false });
      }

      // Create settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // Create apiUsage store
      if (!database.objectStoreNames.contains('apiUsage')) {
        const apiUsageStore = database.createObjectStore('apiUsage', { keyPath: 'timestamp' });
        apiUsageStore.createIndex('date', 'date', { unique: false });
      }

      console.log('IndexedDB schema created');
    };
  });
}

// Get a problem by slug
async function getProblem(slug) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['problems'], 'readonly');
    const store = transaction.objectStore('problems');
    const request = store.get(slug);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save or update a problem
async function saveProblem(problem) {
  console.log('[LeetCode Tracker DB] saveProblem called with:', JSON.stringify(problem, null, 2));
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['problems'], 'readwrite');
    const store = transaction.objectStore('problems');
    const request = store.put(problem);

    request.onsuccess = () => {
      console.log('[LeetCode Tracker DB] saveProblem success. Key:', request.result);
      resolve(request.result);
    };
    request.onerror = () => {
      console.error('[LeetCode Tracker DB] saveProblem error:', request.error);
      reject(request.error);
    };
  });
}

// Get all problems
async function getAllProblems() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['problems'], 'readonly');
    const store = transaction.objectStore('problems');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Add an attempt to a problem
async function addAttempt(slug, problemInfo, attemptData) {
  let problem = await getProblem(slug);
  const now = new Date().toISOString();

  if (!problem) {
    // Create new problem entry
    problem = {
      slug: slug,
      title: problemInfo.title || slug,
      difficulty: problemInfo.difficulty || 'Unknown',
      tags: problemInfo.tags || [],
      attempts: [],
      firstAttempt: now,
      solved: false,
      solvedAt: null
    };
  }

  // Update problem info if available
  if (problemInfo.title) problem.title = problemInfo.title;
  if (problemInfo.difficulty) problem.difficulty = problemInfo.difficulty;
  if (problemInfo.tags && problemInfo.tags.length > 0) problem.tags = problemInfo.tags;

  // Add the attempt
  problem.attempts.push({
    timestamp: now,
    type: attemptData.type,
    passed: attemptData.passed,
    status: attemptData.status,
    statusCode: attemptData.statusCode,
    totalCorrect: attemptData.totalCorrect,
    totalTestcases: attemptData.totalTestcases,
    runtime: attemptData.runtime,
    memory: attemptData.memory,
    failedTestcase: attemptData.failedTestcase || '',
    expectedOutput: attemptData.expectedOutput || '',
    codeOutput: attemptData.codeOutput || '',
    compileError: attemptData.compileError || '',
    runtimeError: attemptData.runtimeError || ''
  });

  // Check if solved (for submit type with passed status)
  if (attemptData.type === 'submit' && attemptData.passed && !problem.solved) {
    problem.solved = true;
    problem.solvedAt = now;
  }

  await saveProblem(problem);
  return problem;
}

// Get a setting
async function getSetting(key) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject(request.error);
  });
}

// Save a setting
async function saveSetting(key, value) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all settings
async function getAllSettings() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.getAll();

    request.onsuccess = () => {
      const settings = {};
      (request.result || []).forEach(item => {
        settings[item.key] = item.value;
      });
      resolve(settings);
    };
    request.onerror = () => reject(request.error);
  });
}

// Record API usage
async function recordApiUsage(tokens, cost) {
  const database = await initDB();
  const now = new Date();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['apiUsage'], 'readwrite');
    const store = transaction.objectStore('apiUsage');
    const request = store.add({
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      tokens: tokens,
      cost: cost
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get API usage statistics
async function getApiUsageStats() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['apiUsage'], 'readonly');
    const store = transaction.objectStore('apiUsage');
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result || [];
      const stats = {
        totalCalls: records.length,
        totalTokens: records.reduce((sum, r) => sum + (r.tokens || 0), 0),
        estimatedCost: records.reduce((sum, r) => sum + (r.cost || 0), 0)
      };
      resolve(stats);
    };
    request.onerror = () => reject(request.error);
  });
}

// Reset API usage statistics
async function resetApiUsageStats() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['apiUsage'], 'readwrite');
    const store = transaction.objectStore('apiUsage');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Export all data to JSON
async function exportData() {
  const problems = await getAllProblems();
  const settings = await getAllSettings();
  const apiUsageStats = await getApiUsageStats();

  // Don't export the API key for security
  const exportSettings = { ...settings };
  delete exportSettings.openaiApiKey;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    problems: problems,
    settings: exportSettings,
    apiUsageStats: apiUsageStats
  };
}

// Import data from JSON
async function importData(data, mergeMode = false) {
  const database = await initDB();

  if (!mergeMode) {
    // Clear existing data
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(['problems'], 'readwrite');
      const store = transaction.objectStore('problems');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import problems
  if (data.problems && Array.isArray(data.problems)) {
    for (const problem of data.problems) {
      if (mergeMode) {
        const existing = await getProblem(problem.slug);
        if (existing) {
          // Merge attempts
          const existingTimestamps = new Set(existing.attempts.map(a => a.timestamp));
          const newAttempts = problem.attempts.filter(a => !existingTimestamps.has(a.timestamp));
          existing.attempts = [...existing.attempts, ...newAttempts].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
          // Update solved status
          if (problem.solved && !existing.solved) {
            existing.solved = true;
            existing.solvedAt = problem.solvedAt;
          }
          await saveProblem(existing);
        } else {
          await saveProblem(problem);
        }
      } else {
        await saveProblem(problem);
      }
    }
  }

  // Import settings (except API key)
  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      if (key !== 'openaiApiKey') {
        await saveSetting(key, value);
      }
    }
  }

  return { success: true, problemsImported: data.problems?.length || 0 };
}

// Clear all data
async function clearAllData() {
  const database = await initDB();

  const stores = ['problems', 'settings', 'apiUsage'];

  for (const storeName of stores) {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  return { success: true };
}

// Encryption helpers using Web Crypto API
async function getEncryptionKey() {
  let keyData = await getSetting('encryptionKey');

  if (!keyData) {
    // Generate a new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    keyData = await crypto.subtle.exportKey('jwk', key);
    await saveSetting('encryptionKey', keyData);
  }

  return crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptApiKey(apiKey) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedKey = new TextEncoder().encode(apiKey);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedKey
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}

async function decryptApiKey(encryptedData) {
  if (!encryptedData || !encryptedData.iv || !encryptedData.data) {
    return null;
  }

  try {
    const key = await getEncryptionKey();
    const iv = new Uint8Array(encryptedData.iv);
    const data = new Uint8Array(encryptedData.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}

// Save encrypted API key
async function saveApiKey(apiKey) {
  const encrypted = await encryptApiKey(apiKey);
  await saveSetting('openaiApiKey', encrypted);
}

// Get decrypted API key
async function getApiKey() {
  const encrypted = await getSetting('openaiApiKey');
  if (!encrypted) return null;
  return decryptApiKey(encrypted);
}

// Export functions for use in other scripts
export {
  initDB,
  getProblem,
  saveProblem,
  getAllProblems,
  addAttempt,
  getSetting,
  saveSetting,
  getAllSettings,
  recordApiUsage,
  getApiUsageStats,
  resetApiUsageStats,
  exportData,
  importData,
  clearAllData,
  saveApiKey,
  getApiKey
};
