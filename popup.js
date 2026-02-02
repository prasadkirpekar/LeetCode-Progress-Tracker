// Popup UI logic for LeetCode Progress Tracker

document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  initTabs();
  loadOverview();
  loadSettings();

  // Tab switching
  function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(targetId).classList.add('active');

        // Load tab-specific data
        if (targetId === 'overview') loadOverview();
        if (targetId === 'insights') loadInsights();
        if (targetId === 'problems') loadProblems();
        if (targetId === 'settings') loadSettings();
      });
    });
  }

  // Format time ago
  function formatTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    return then.toLocaleDateString();
  }

  // Send message to background script
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // Load Overview tab
  async function loadOverview() {
    try {
      const response = await sendMessage({ type: 'getStats' });
      if (!response.success) return;

      const stats = response.data;

      // Update stat cards
      document.getElementById('total-problems').textContent = stats.totalProblems;
      document.getElementById('total-solved').textContent = stats.totalSolved;
      document.getElementById('total-attempts').textContent = stats.totalAttempts;
      document.getElementById('success-rate').textContent = stats.successRate + '%';

      // Update difficulty breakdown
      document.getElementById('easy-stats').textContent =
        `${stats.difficulty.Easy.solved}/${stats.difficulty.Easy.attempted}`;
      document.getElementById('medium-stats').textContent =
        `${stats.difficulty.Medium.solved}/${stats.difficulty.Medium.attempted}`;
      document.getElementById('hard-stats').textContent =
        `${stats.difficulty.Hard.solved}/${stats.difficulty.Hard.attempted}`;

      // Update recent activity
      const activityContainer = document.getElementById('recent-activity');
      if (stats.recentActivity.length === 0) {
        activityContainer.innerHTML = `
          <div class="empty-state">
            <p>No activity yet. Start solving problems on LeetCode!</p>
          </div>
        `;
      } else {
        activityContainer.innerHTML = stats.recentActivity.map(activity => `
          <div class="activity-item">
            <div class="activity-icon ${activity.passed ? 'passed' : 'failed'}">
              ${activity.passed ? '✓' : '✗'}
            </div>
            <div class="activity-info">
              <div class="activity-title">${escapeHtml(activity.problemTitle)}</div>
              <div class="activity-meta">
                <span class="difficulty ${activity.problemDifficulty?.toLowerCase()}">${activity.problemDifficulty}</span>
                <span>${activity.type === 'submit' ? 'Submit' : 'Run'}</span>
                <span>${activity.totalCorrect}/${activity.totalTestcases} passed</span>
              </div>
            </div>
            <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error loading overview:', error);
    }
  }

  // Load Insights tab
  async function loadInsights() {
    try {
      const response = await sendMessage({ type: 'getStats' });
      if (!response.success) return;

      const stats = response.data;

      // Solve rate info
      const easyRate = stats.difficulty.Easy.attempted > 0
        ? Math.round((stats.difficulty.Easy.solved / stats.difficulty.Easy.attempted) * 100)
        : 0;
      const mediumRate = stats.difficulty.Medium.attempted > 0
        ? Math.round((stats.difficulty.Medium.solved / stats.difficulty.Medium.attempted) * 100)
        : 0;
      const hardRate = stats.difficulty.Hard.attempted > 0
        ? Math.round((stats.difficulty.Hard.solved / stats.difficulty.Hard.attempted) * 100)
        : 0;

      document.getElementById('solve-rate-info').textContent =
        `Easy: ${easyRate}%, Medium: ${mediumRate}%, Hard: ${hardRate}%`;

      // Common issues
      const issues = [];
      if (stats.failurePatterns.tle > 0) issues.push(`TLE: ${stats.failurePatterns.tle}`);
      if (stats.failurePatterns.runtimeError > 0) issues.push(`Runtime Errors: ${stats.failurePatterns.runtimeError}`);
      if (stats.failurePatterns.wrongAnswer > 0) issues.push(`Wrong Answers: ${stats.failurePatterns.wrongAnswer}`);
      if (stats.failurePatterns.compileError > 0) issues.push(`Compile Errors: ${stats.failurePatterns.compileError}`);

      document.getElementById('common-issues-info').textContent =
        issues.length > 0 ? issues.join(', ') : 'No issues detected';

      // Average attempts
      const avgAttempts = stats.totalProblems > 0
        ? (stats.totalAttempts / stats.totalProblems).toFixed(1)
        : 0;
      document.getElementById('avg-attempts-info').textContent =
        `${avgAttempts} attempts per problem on average`;

      // Problems needing attention
      const attentionContainer = document.getElementById('attention-problems');
      if (stats.problemsNeedingAttention.length === 0) {
        attentionContainer.innerHTML = `
          <div class="empty-state">
            <p>No problems need special attention.</p>
          </div>
        `;
      } else {
        attentionContainer.innerHTML = stats.problemsNeedingAttention.map(problem => `
          <div class="problem-item" data-slug="${problem.slug}">
            <div class="problem-info">
              <div class="problem-title">${escapeHtml(problem.title)}</div>
              <div class="problem-meta">
                <span class="difficulty ${problem.difficulty?.toLowerCase()}">${problem.difficulty}</span>
                <span>${problem.failedAttempts} failed attempts</span>
              </div>
            </div>
          </div>
        `).join('');

        // Add click handlers
        attentionContainer.querySelectorAll('.problem-item').forEach(item => {
          item.addEventListener('click', () => {
            document.querySelector('[data-tab="problems"]').click();
            setTimeout(() => showProblemDetail(item.dataset.slug), 100);
          });
        });
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  }

  // Generate AI Insights button
  document.getElementById('generate-insights-btn').addEventListener('click', async () => {
    const btn = document.getElementById('generate-insights-btn');
    const container = document.getElementById('ai-insights');

    btn.disabled = true;
    btn.textContent = 'Generating...';
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Generating insights...</div>';

    try {
      const response = await sendMessage({ type: 'generateInsights' });

      if (response.success) {
        container.innerHTML = `
          <div class="insights-content">${formatMarkdown(response.content)}</div>
          <div style="margin-top: 12px; font-size: 11px; color: #666;">
            Tokens used: ${response.tokens} | Cost: $${response.cost.toFixed(4)}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state" style="color: #f87171;">
            <p>${escapeHtml(response.error)}</p>
          </div>
        `;
      }
    } catch (error) {
      container.innerHTML = `
        <div class="empty-state" style="color: #f87171;">
          <p>Failed to generate insights: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }

    btn.disabled = false;
    btn.textContent = 'Generate AI Insights';
  });

  // Load Problems tab
  async function loadProblems() {
    const listContainer = document.getElementById('problem-list');
    const detailContainer = document.getElementById('problem-detail');

    // Show list, hide detail
    listContainer.style.display = 'block';
    detailContainer.classList.remove('active');

    try {
      const response = await sendMessage({ type: 'getAllProblems' });
      if (!response.success) return;

      const problems = response.data;

      if (problems.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state">
            <p>No problems tracked yet. Start solving on LeetCode!</p>
          </div>
        `;
        return;
      }

      // Sort by most recent attempt
      problems.sort((a, b) => {
        const aLast = a.attempts[a.attempts.length - 1]?.timestamp || a.firstAttempt;
        const bLast = b.attempts[b.attempts.length - 1]?.timestamp || b.firstAttempt;
        return new Date(bLast) - new Date(aLast);
      });

      listContainer.innerHTML = problems.map(problem => `
        <div class="problem-item" data-slug="${problem.slug}">
          <div class="problem-info">
            <div class="problem-title">${escapeHtml(problem.title)}</div>
            <div class="problem-meta">
              <span class="difficulty ${problem.difficulty?.toLowerCase()}">${problem.difficulty}</span>
              <span>${problem.attempts.length} attempts</span>
              <span class="status ${problem.solved ? 'solved' : 'unsolved'}">
                ${problem.solved ? 'Solved' : 'Unsolved'}
              </span>
            </div>
            <div class="problem-tags">
              ${(problem.tags || []).slice(0, 3).map(tag =>
        `<span class="tag">${escapeHtml(tag)}</span>`
      ).join('')}
            </div>
          </div>
          <div class="problem-arrow">→</div>
        </div>
      `).join('');

      // Add click handlers
      listContainer.querySelectorAll('.problem-item').forEach(item => {
        item.addEventListener('click', () => showProblemDetail(item.dataset.slug));
      });
    } catch (error) {
      console.error('Error loading problems:', error);
    }
  }

  // Show problem detail
  async function showProblemDetail(slug) {
    const listContainer = document.getElementById('problem-list');
    const detailContainer = document.getElementById('problem-detail');

    try {
      const response = await sendMessage({ type: 'getProblem', slug });
      if (!response.success || !response.data) return;

      const problem = response.data;

      // Update detail view
      document.getElementById('detail-title').textContent = problem.title;
      document.getElementById('detail-difficulty').textContent = problem.difficulty;
      document.getElementById('detail-difficulty').className = `difficulty ${problem.difficulty?.toLowerCase()}`;
      document.getElementById('detail-attempts').textContent = `${problem.attempts.length} attempts`;
      document.getElementById('detail-status').textContent = problem.solved ? 'Solved' : 'Unsolved';
      document.getElementById('detail-status').className = `status ${problem.solved ? 'solved' : 'unsolved'}`;

      // Tags
      document.getElementById('detail-tags').innerHTML = (problem.tags || []).map(tag =>
        `<span class="tag">${escapeHtml(tag)}</span>`
      ).join('');

      // Attempt history
      const historyContainer = document.getElementById('attempt-history');
      const sortedAttempts = [...problem.attempts].reverse();

      historyContainer.innerHTML = sortedAttempts.map(attempt => `
        <div class="attempt-item">
          <div class="attempt-header">
            <span class="attempt-type">${attempt.type === 'submit' ? '📤 Submit' : '▶️ Run'}</span>
            <span class="attempt-time">${formatTimeAgo(attempt.timestamp)}</span>
          </div>
          <div>
            <span class="status ${attempt.passed ? 'passed' : 'failed'}">${attempt.status}</span>
          </div>
          <div class="attempt-details">
            ${attempt.totalCorrect}/${attempt.totalTestcases} test cases passed
            ${attempt.runtime ? ` • ${attempt.runtime}` : ''}
            ${attempt.memory ? ` • ${attempt.memory}` : ''}
          </div>
          ${attempt.failedTestcase ? `
            <div class="attempt-error" style="${attempt.passed ? 'background: rgba(74, 222, 128, 0.1); color: #e0e0e0;' : ''}">
              <strong>${attempt.passed ? 'Input:' : 'Failed Input:'}</strong> ${escapeHtml(attempt.failedTestcase.slice(0, 200))}
              ${attempt.expectedOutput ? `\n<strong>Expected:</strong> ${escapeHtml(attempt.expectedOutput.slice(0, 100))}` : ''}
              ${attempt.codeOutput ? `\n<strong>Output:</strong> ${escapeHtml(attempt.codeOutput.slice(0, 100))}` : ''}
            </div>
          ` : ''}
          ${attempt.compileError ? `
            <div class="attempt-error">
              <strong>Compile Error:</strong> ${escapeHtml(attempt.compileError.slice(0, 300))}
            </div>
          ` : ''}
          ${attempt.runtimeError ? `
            <div class="attempt-error">
              <strong>Runtime Error:</strong> ${escapeHtml(attempt.runtimeError.slice(0, 300))}
            </div>
          ` : ''}
        </div>
      `).join('');

      // Clear previous analysis
      document.getElementById('problem-analysis').innerHTML = '';

      // Store slug for analysis
      document.getElementById('analyze-problem-btn').dataset.slug = slug;

      // Show detail view
      listContainer.style.display = 'none';
      detailContainer.classList.add('active');
    } catch (error) {
      console.error('Error loading problem detail:', error);
    }
  }

  // Back to problem list
  document.getElementById('back-to-list').addEventListener('click', () => {
    document.getElementById('problem-list').style.display = 'block';
    document.getElementById('problem-detail').classList.remove('active');
  });

  // Analyze problem with AI
  document.getElementById('analyze-problem-btn').addEventListener('click', async () => {
    const btn = document.getElementById('analyze-problem-btn');
    const container = document.getElementById('problem-analysis');
    const slug = btn.dataset.slug;

    btn.disabled = true;
    btn.textContent = 'Analyzing...';
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Analyzing problem...</div>';

    try {
      const response = await sendMessage({ type: 'analyzeProblem', slug });

      if (response.success) {
        container.innerHTML = `
          <div class="card" style="margin-top: 12px;">
            <div class="card-title">AI Analysis</div>
            <div class="insights-content">${formatMarkdown(response.content)}</div>
            <div style="margin-top: 12px; font-size: 11px; color: #666;">
              Tokens used: ${response.tokens} | Cost: $${response.cost.toFixed(4)}
            </div>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="card" style="margin-top: 12px; color: #f87171;">
            <p>${escapeHtml(response.error)}</p>
          </div>
        `;
      }
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="margin-top: 12px; color: #f87171;">
          <p>Failed to analyze: ${escapeHtml(error.message)}</p>
        </div>
      `;
    }

    btn.disabled = false;
    btn.textContent = 'Analyze with AI';
  });

  // Load Settings tab
  async function loadSettings() {
    try {
      // Load settings
      const settingsResponse = await sendMessage({ type: 'getSettings' });
      if (settingsResponse.success) {
        const settings = settingsResponse.data;

        // API key status
        const keyStatus = document.getElementById('api-key-status');
        if (settings.hasApiKey) {
          keyStatus.textContent = '✓ API key saved';
          keyStatus.className = 'key-status saved';
        } else {
          keyStatus.textContent = 'API key not saved';
          keyStatus.className = 'key-status not-saved';
        }

        // AI toggle
        const aiToggle = document.getElementById('ai-toggle');
        if (settings.aiEnabled !== false) {
          aiToggle.classList.add('active');
        } else {
          aiToggle.classList.remove('active');
        }
      }

      // Load API usage stats
      const usageResponse = await sendMessage({ type: 'getApiUsageStats' });
      if (usageResponse.success) {
        const usage = usageResponse.data;
        document.getElementById('api-calls').textContent = usage.totalCalls;
        document.getElementById('api-tokens').textContent = formatNumber(usage.totalTokens);
        document.getElementById('api-cost').textContent = '$' + usage.estimatedCost.toFixed(4);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Save API key
  document.getElementById('save-api-key-btn').addEventListener('click', async () => {
    const input = document.getElementById('api-key-input');
    const apiKey = input.value.trim();

    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    try {
      await sendMessage({ type: 'saveApiKey', apiKey });
      input.value = '';
      loadSettings();
      alert('API key saved successfully');
    } catch (error) {
      alert('Failed to save API key: ' + error.message);
    }
  });

  // Test API key
  document.getElementById('test-api-key-btn').addEventListener('click', async () => {
    const input = document.getElementById('api-key-input');
    const apiKey = input.value.trim();

    if (!apiKey) {
      alert('Please enter an API key to test');
      return;
    }

    const btn = document.getElementById('test-api-key-btn');
    btn.disabled = true;
    btn.textContent = 'Testing...';

    try {
      const response = await sendMessage({ type: 'testApiKey', apiKey });
      if (response.success) {
        alert('API key is valid!');
      } else {
        alert('API key test failed: ' + response.error);
      }
    } catch (error) {
      alert('Test failed: ' + error.message);
    }

    btn.disabled = false;
    btn.textContent = 'Test Connection';
  });

  // AI toggle
  document.getElementById('ai-toggle').addEventListener('click', async () => {
    const toggle = document.getElementById('ai-toggle');
    const isActive = toggle.classList.contains('active');

    toggle.classList.toggle('active');

    try {
      await sendMessage({ type: 'saveSetting', key: 'aiEnabled', value: !isActive });
    } catch (error) {
      console.error('Error saving AI toggle:', error);
      toggle.classList.toggle('active'); // Revert on error
    }
  });

  // Reset stats
  document.getElementById('reset-stats-btn').addEventListener('click', async () => {
    if (confirm('Reset all API usage statistics?')) {
      try {
        await sendMessage({ type: 'resetApiUsageStats' });
        loadSettings();
      } catch (error) {
        alert('Failed to reset stats: ' + error.message);
      }
    }
  });

  // Export data
  document.getElementById('export-btn').addEventListener('click', async () => {
    try {
      const response = await sendMessage({ type: 'exportData' });
      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leetcode-progress-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  });

  // Import data
  let importedData = null;

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      importedData = JSON.parse(text);

      // Show import options modal
      document.getElementById('import-modal').classList.add('active');
    } catch (error) {
      alert('Failed to read file: ' + error.message);
    }

    e.target.value = '';
  });

  document.getElementById('import-merge').addEventListener('click', async () => {
    document.getElementById('import-modal').classList.remove('active');
    if (importedData) {
      try {
        const response = await sendMessage({ type: 'importData', data: importedData, merge: true });
        if (response.success) {
          alert(`Imported ${response.problemsImported} problems (merged)`);
          loadOverview();
          loadProblems();
        }
      } catch (error) {
        alert('Import failed: ' + error.message);
      }
    }
  });

  document.getElementById('import-replace').addEventListener('click', async () => {
    document.getElementById('import-modal').classList.remove('active');
    if (importedData) {
      try {
        const response = await sendMessage({ type: 'importData', data: importedData, merge: false });
        if (response.success) {
          alert(`Imported ${response.problemsImported} problems (replaced)`);
          loadOverview();
          loadProblems();
        }
      } catch (error) {
        alert('Import failed: ' + error.message);
      }
    }
  });

  document.getElementById('import-cancel').addEventListener('click', () => {
    document.getElementById('import-modal').classList.remove('active');
    importedData = null;
  });

  // Clear all data
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Clear All Data?';
    document.getElementById('modal-message').textContent =
      'This will permanently delete all tracked problems and settings. This action cannot be undone.';
    document.getElementById('confirm-modal').classList.add('active');
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('active');
  });

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    document.getElementById('confirm-modal').classList.remove('active');

    try {
      await sendMessage({ type: 'clearAllData' });
      alert('All data cleared');
      loadOverview();
      loadProblems();
      loadSettings();
    } catch (error) {
      alert('Failed to clear data: ' + error.message);
    }
  });

  // Utility functions
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatMarkdown(text) {
    if (!text) return '';

    // Escape HTML first
    let html = escapeHtml(text);

    // Convert markdown-like formatting
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }
});
