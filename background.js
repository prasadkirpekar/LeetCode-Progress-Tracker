// Background service worker for LeetCode Progress Tracker
import * as LeetCodeDB from './db.js';
import * as LeetCodeAPI from './api.js';

console.log('[LeetCode Tracker] Background service worker started');

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[LeetCode Tracker] Received message:', message.type);

  // Handle async operations
  (async () => {
    try {
      switch (message.type) {
        case 'contentScriptReady':
          console.log('[LeetCode Tracker] Content script ready:', message.data);
          sendResponse({ success: true });
          break;

        case 'attemptResult':
          await handleAttemptResult(message.data);
          sendResponse({ success: true });
          break;

        case 'getStats':
          const stats = await getStatistics();
          sendResponse({ success: true, data: stats });
          break;

        case 'getAllProblems':
          const problems = await LeetCodeDB.getAllProblems();
          sendResponse({ success: true, data: problems });
          break;

        case 'getProblem':
          const problem = await LeetCodeDB.getProblem(message.slug);
          sendResponse({ success: true, data: problem });
          break;

        case 'getSettings':
          const settings = await LeetCodeDB.getAllSettings();
          const hasApiKey = !!(await LeetCodeDB.getApiKey());
          sendResponse({ success: true, data: { ...settings, hasApiKey } });
          break;

        case 'saveApiKey':
          await LeetCodeDB.saveApiKey(message.apiKey);
          sendResponse({ success: true });
          break;

        case 'testApiKey':
          const testResult = await LeetCodeAPI.testApiKey(message.apiKey);
          sendResponse(testResult);
          break;

        case 'saveSetting':
          await LeetCodeDB.saveSetting(message.key, message.value);
          sendResponse({ success: true });
          break;

        case 'getApiUsageStats':
          const usageStats = await LeetCodeDB.getApiUsageStats();
          sendResponse({ success: true, data: usageStats });
          break;

        case 'resetApiUsageStats':
          await LeetCodeDB.resetApiUsageStats();
          sendResponse({ success: true });
          break;

        case 'generateInsights':
          const insights = await generateAIInsights();
          sendResponse(insights);
          break;

        case 'analyzeProblem':
          const analysis = await analyzeProblemWithAI(message.slug);
          sendResponse(analysis);
          break;

        case 'exportData':
          const exportedData = await LeetCodeDB.exportData();
          sendResponse({ success: true, data: exportedData });
          break;

        case 'importData':
          const importResult = await LeetCodeDB.importData(message.data, message.merge);
          sendResponse(importResult);
          break;

        case 'clearAllData':
          await LeetCodeDB.clearAllData();
          sendResponse({ success: true });
          break;

        default:
          console.warn('[LeetCode Tracker] Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[LeetCode Tracker] Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Handle attempt result from content script
async function handleAttemptResult(data) {
  const { problemInfo, result } = data;

  console.log('[LeetCode Tracker] handleAttemptResult called with:', { problemInfo, result });

  if (!problemInfo.slug) {
    console.error('[LeetCode Tracker] No slug found for problem. Cannot save.');
    return;
  }

  try {
    console.log('[LeetCode Tracker] Saving attempt to DB for slug:', problemInfo.slug);
    const savedProblem = await LeetCodeDB.addAttempt(problemInfo.slug, problemInfo, result);
    console.log('[LeetCode Tracker] Successfully saved problem attempt:', JSON.stringify(savedProblem, null, 2));
  } catch (error) {
    console.error('[LeetCode Tracker] Error saving attempt to DB:', error);
  }
}

// Calculate statistics from stored data
async function getStatistics() {
  const problems = await LeetCodeDB.getAllProblems();

  const stats = {
    totalProblems: problems.length,
    totalSolved: 0,
    totalAttempts: 0,
    successRate: 0,
    difficulty: {
      Easy: { attempted: 0, solved: 0 },
      Medium: { attempted: 0, solved: 0 },
      Hard: { attempted: 0, solved: 0 }
    },
    recentActivity: [],
    failurePatterns: {
      tle: 0,
      runtimeError: 0,
      wrongAnswer: 0,
      compileError: 0
    },
    problemsNeedingAttention: [],
    topicStats: {}
  };

  const allAttempts = [];

  problems.forEach(problem => {
    // Count total attempts
    stats.totalAttempts += problem.attempts.length;

    // Count solved
    if (problem.solved) {
      stats.totalSolved++;
    }

    // Difficulty breakdown
    const diff = problem.difficulty || 'Unknown';
    if (stats.difficulty[diff]) {
      stats.difficulty[diff].attempted++;
      if (problem.solved) {
        stats.difficulty[diff].solved++;
      }
    }

    // Collect all attempts for recent activity
    problem.attempts.forEach(attempt => {
      allAttempts.push({
        ...attempt,
        problemSlug: problem.slug,
        problemTitle: problem.title,
        problemDifficulty: problem.difficulty
      });

      // Track failure patterns
      if (!attempt.passed) {
        if (attempt.statusCode === 14 || attempt.status?.includes('Time Limit')) {
          stats.failurePatterns.tle++;
        } else if (attempt.runtimeError || attempt.status?.includes('Runtime Error')) {
          stats.failurePatterns.runtimeError++;
        } else if (attempt.compileError || attempt.status?.includes('Compile Error')) {
          stats.failurePatterns.compileError++;
        } else {
          stats.failurePatterns.wrongAnswer++;
        }
      }
    });

    // Track topic stats
    (problem.tags || []).forEach(tag => {
      if (!stats.topicStats[tag]) {
        stats.topicStats[tag] = { attempted: 0, solved: 0, attempts: 0 };
      }
      stats.topicStats[tag].attempted++;
      stats.topicStats[tag].attempts += problem.attempts.length;
      if (problem.solved) {
        stats.topicStats[tag].solved++;
      }
    });

    // Problems needing attention (3+ failed attempts and not solved)
    const failedAttempts = problem.attempts.filter(a => !a.passed).length;
    if (failedAttempts >= 3 && !problem.solved) {
      stats.problemsNeedingAttention.push({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        failedAttempts: failedAttempts,
        totalAttempts: problem.attempts.length
      });
    }
  });

  // Calculate success rate
  if (stats.totalProblems > 0) {
    stats.successRate = Math.round((stats.totalSolved / stats.totalProblems) * 100);
  }

  // Get recent activity (last 5 attempts)
  allAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  stats.recentActivity = allAttempts.slice(0, 5);

  // Sort problems needing attention by failed attempts
  stats.problemsNeedingAttention.sort((a, b) => b.failedAttempts - a.failedAttempts);
  stats.problemsNeedingAttention = stats.problemsNeedingAttention.slice(0, 5);

  return stats;
}

// Generate AI insights using OpenAI
async function generateAIInsights() {
  const apiKey = await LeetCodeDB.getApiKey();
  if (!apiKey) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  const aiEnabled = await LeetCodeDB.getSetting('aiEnabled');
  if (aiEnabled === false) {
    return { success: false, error: 'AI features are disabled' };
  }

  const stats = await getStatistics();
  const problems = await LeetCodeDB.getAllProblems();

  // Prepare summary data for AI
  const summary = {
    totalProblems: stats.totalProblems,
    totalSolved: stats.totalSolved,
    successRate: stats.successRate,
    difficulty: stats.difficulty,
    failurePatterns: stats.failurePatterns,
    topicStats: stats.topicStats,
    problemsNeedingAttention: stats.problemsNeedingAttention,
    recentProblems: problems.slice(-10).map(p => ({
      title: p.title,
      difficulty: p.difficulty,
      solved: p.solved,
      attempts: p.attempts.length,
      tags: p.tags
    }))
  };

  const prompt = `Analyze this LeetCode progress data and provide:
1. Key strengths and weaknesses
2. Specific algorithmic concepts to study
3. Learning path recommendations
4. 5 specific LeetCode problems to solve next (with explanations why)

Data: ${JSON.stringify(summary, null, 2)}

Please format your response in clear sections with headers.`;

  const result = await LeetCodeAPI.callOpenAI(apiKey, prompt);

  if (result.success) {
    // Record API usage
    await LeetCodeDB.recordApiUsage(result.tokens, result.cost);
  }

  return result;
}

// Analyze a specific problem with AI
async function analyzeProblemWithAI(slug) {
  const apiKey = await LeetCodeDB.getApiKey();
  if (!apiKey) {
    return { success: false, error: 'OpenAI API key not configured' };
  }

  const aiEnabled = await LeetCodeDB.getSetting('aiEnabled');
  if (aiEnabled === false) {
    return { success: false, error: 'AI features are disabled' };
  }

  const problem = await LeetCodeDB.getProblem(slug);
  if (!problem) {
    return { success: false, error: 'Problem not found' };
  }

  const prompt = `Analyze my attempts at this LeetCode problem and provide specific advice:

Problem: ${problem.title}
Difficulty: ${problem.difficulty}
Tags: ${(problem.tags || []).join(', ')}
Solved: ${problem.solved ? 'Yes' : 'No'}
Total Attempts: ${problem.attempts.length}

Recent attempts:
${problem.attempts.slice(-5).map(a => `- ${a.type}: ${a.status} (${a.totalCorrect}/${a.totalTestcases} test cases)${a.compileError ? ' - Compile error: ' + a.compileError.slice(0, 100) : ''}${a.runtimeError ? ' - Runtime error: ' + a.runtimeError.slice(0, 100) : ''}`).join('\n')}

Please provide:
1. Why I might be struggling with this problem
2. Key concepts I should review
3. Step-by-step approach to solve this problem
4. Common pitfalls to avoid`;

  const result = await LeetCodeAPI.callOpenAI(apiKey, prompt);

  if (result.success) {
    // Record API usage
    await LeetCodeDB.recordApiUsage(result.tokens, result.cost);
  }

  return result;
}

// Initialize database on startup
LeetCodeDB.initDB().then(() => {
  console.log('[LeetCode Tracker] Database initialized');
}).catch(error => {
  console.error('[LeetCode Tracker] Failed to initialize database:', error);
});
