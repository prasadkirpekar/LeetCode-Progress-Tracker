// Content script for LeetCode Progress Tracker
// Injected into LeetCode problem pages to intercept API calls

(function () {
  'use strict';

  console.log('[LeetCode Tracker] Content script loaded v2');

  // Track pending submissions to match with results
  const pendingSubmissions = new Map();

  // Extract problem information from the page
  function extractProblemInfo() {
    const info = {
      title: null,
      slug: null,
      difficulty: null,
      tags: []
    };

    // Extract slug from URL
    const urlMatch = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (urlMatch) {
      info.slug = urlMatch[1];
    }

    // Extract title - try multiple selectors
    const titleSelectors = [
      '[data-cy="question-title"]',
      '.text-title-large',
      'div[class*="text-title-large"]',
      'a[class*="text-title-large"]',
      '[class*="question-title"]',
      'h4[class*="title"]'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        info.title = element.textContent.trim();
        break;
      }
    }

    // Extract difficulty
    const difficultySelectors = [
      '[diff]',
      '.text-difficulty-easy',
      '.text-difficulty-medium',
      '.text-difficulty-hard',
      'div[class*="text-difficulty"]',
      'span[class*="text-difficulty"]',
      '[class*="difficulty"]'
    ];

    for (const selector of difficultySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim().toLowerCase();
        if (text.includes('easy')) {
          info.difficulty = 'Easy';
          break;
        } else if (text.includes('medium')) {
          info.difficulty = 'Medium';
          break;
        } else if (text.includes('hard')) {
          info.difficulty = 'Hard';
          break;
        }
      }
    }

    // Also check for difficulty by color class
    if (!info.difficulty) {
      if (document.querySelector('[class*="text-olive"]') ||
        document.querySelector('[class*="text-green"]')) {
        info.difficulty = 'Easy';
      } else if (document.querySelector('[class*="text-yellow"]') ||
        document.querySelector('[class*="text-orange"]')) {
        info.difficulty = 'Medium';
      } else if (document.querySelector('[class*="text-red"]') ||
        document.querySelector('[class*="text-pink"]')) {
        info.difficulty = 'Hard';
      }
    }

    // Extract tags
    const tagSelectors = [
      '[class*="topic-tag"]',
      'a[href*="/tag/"]',
      '[class*="tag-"]'
    ];

    for (const selector of tagSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const tag = el.textContent.trim();
        if (tag && !info.tags.includes(tag) && tag.length < 50) {
          info.tags.push(tag);
        }
      });
    }

    return info;
  }

  // Send data to background script
  function sendToBackground(type, data) {
    chrome.runtime.sendMessage({
      type: type,
      data: data
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('[LeetCode Tracker] Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('[LeetCode Tracker] Message sent successfully:', type);
      }
    });
  }

  // Parse submission result
  function parseSubmissionResult(data, type, testCase = null) {
    console.log('[LeetCode Tracker] Parsing result data:', JSON.stringify(data, null, 2));

    const result = {
      type: type,
      passed: false,
      status: data.status_msg || data.state || 'Unknown',
      statusCode: data.status_code || 0,
      totalCorrect: data.total_correct || 0,
      totalTestcases: data.total_testcases || 0,
      runtime: data.status_runtime || '',
      memory: data.status_memory || '',
      failedTestcase: '',
      expectedOutput: '',
      codeOutput: '',
      compileError: '',
      runtimeError: ''
    };

    // For run code results, determine pass/fail based on correct_answer field
    if (type === 'run') {
      // correct_answer is the definitive field for run results
      if (data.correct_answer === true) {
        result.passed = true;
      } else {
        result.passed = false;
      }

      // For run code, extract expected vs actual from code_answer arrays
      if (data.expected_code_answer && Array.isArray(data.expected_code_answer)) {
        result.expectedOutput = data.expected_code_answer.filter(x => x !== '').join('\n');
      }
      if (data.code_answer && Array.isArray(data.code_answer)) {
        result.codeOutput = data.code_answer.filter(x => x !== '' && x !== 'null').join('\n');
      }

      // Use compare_result to count correct test cases if total_correct is 0
      if (data.compare_result && result.totalCorrect === 0) {
        result.totalCorrect = (data.compare_result.match(/1/g) || []).length;
      }
      if (data.compare_result && result.totalTestcases === 0) {
        result.totalTestcases = data.compare_result.length;
      }
    } else {
      // For submit results, use status_code === 10 for Accepted
      if (data.status_code === 10 || data.status_msg === 'Accepted') {
        result.passed = true;
      }
    }

    // Extract failed test case info
    if (data.input_formatted) {
      result.failedTestcase = data.input_formatted;
    } else if (data.input) {
      result.failedTestcase = data.input;
    } else if (data.last_testcase) {
      result.failedTestcase = data.last_testcase;
    }

    // Fallback to captured test case for run actions if not provided in result
    if (type === 'run' && !result.failedTestcase && testCase) {
      result.failedTestcase = testCase;
    }

    // For submit results, extract expected output
    if (type === 'submit') {
      if (data.expected_output) {
        result.expectedOutput = data.expected_output;
      }
      if (data.code_output) {
        result.codeOutput = Array.isArray(data.code_output)
          ? data.code_output.join('\n')
          : data.code_output;
      } else if (data.std_output) {
        result.codeOutput = data.std_output;
      }
    }

    // Compile error
    if (data.compile_error) {
      result.compileError = data.compile_error;
    } else if (data.full_compile_error) {
      result.compileError = data.full_compile_error;
    }

    // Runtime error
    if (data.runtime_error) {
      result.runtimeError = data.runtime_error;
    } else if (data.full_runtime_error) {
      result.runtimeError = data.full_runtime_error;
    }

    console.log('[LeetCode Tracker] Parsed result:', result);
    return result;
  }

  // Poll for submission result
  async function pollSubmissionResult(submissionId, type, problemInfo, testCase = null) {
    const maxAttempts = 30;
    const pollInterval = 1000;
    let attempts = 0;

    console.log('[LeetCode Tracker] Starting poll for', type, 'submission:', submissionId);

    const poll = async () => {
      attempts++;
      console.log('[LeetCode Tracker] Poll attempt', attempts, 'for', submissionId);

      try {
        const checkUrl = `https://leetcode.com/submissions/detail/${submissionId}/check/`;
        console.log('[LeetCode Tracker] Fetching:', checkUrl);

        const response = await fetch(checkUrl, {
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('[LeetCode Tracker] Failed to check submission:', response.status);
          return;
        }

        const data = await response.json();
        console.log('[LeetCode Tracker] Poll response state:', data.state);

        if (data.state === 'PENDING' || data.state === 'STARTED') {
          if (attempts < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            console.warn('[LeetCode Tracker] Max poll attempts reached for', submissionId);
          }
          return;
        }

        // Submission complete
        console.log('[LeetCode Tracker] Submission complete, parsing result...');
        const result = parseSubmissionResult(data, type, testCase);
        console.log('[LeetCode Tracker] Final result:', result);

        console.log('[LeetCode Tracker] Sending to background:', {
          problemInfo: problemInfo,
          result: result
        });

        sendToBackground('attemptResult', {
          problemInfo: problemInfo,
          result: result
        });

      } catch (error) {
        console.error('[LeetCode Tracker] Error polling submission:', error);
      }
    };

    poll();
  }

  // Inject the main world script
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
      script.remove();
    };
    console.log('[LeetCode Tracker] Injected main world script');
  }

  // Listen for messages from injected script
  window.addEventListener('LeetCodeTracker_Intercept', function (e) {
    console.log('[LeetCode Tracker] Received intercept event:', e.detail);
    const { type, id, testCase } = e.detail;

    // We get the problem info NOW, which ensures it's fresh
    const problemInfo = extractProblemInfo();

    // Check if we already have this submission pending
    if (pendingSubmissions.has(id)) {
      return;
    }

    pendingSubmissions.set(id, { type, problemInfo, testCase });
    pollSubmissionResult(id, type, problemInfo, testCase);
  });

  // Initial injection
  injectScript();

  // Set up DOM observers when document is ready
  function setupObservers() {
    console.log('[LeetCode Tracker] Setting up observers, document.body exists:', !!document.body);

    // Safety check - if body doesn't exist yet, wait
    if (!document.body) {
      console.log('[LeetCode Tracker] document.body not ready, waiting...');
      setTimeout(setupObservers, 100);
      return;
    }

    // Notify background script that content script is ready
    sendToBackground('contentScriptReady', {
      url: window.location.href,
      problemInfo: extractProblemInfo()
    });

    // Re-extract problem info when page content changes (for SPA navigation)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('[LeetCode Tracker] URL changed, re-extracting problem info');
        setTimeout(() => {
          sendToBackground('contentScriptReady', {
            url: window.location.href,
            problemInfo: extractProblemInfo()
          });
        }, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[LeetCode Tracker] MutationObserver set up successfully');
  }

  // Wait for DOM to be fully ready
  if (document.readyState === 'loading') {
    console.log('[LeetCode Tracker] Document loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', setupObservers);
  } else {
    console.log('[LeetCode Tracker] Document already loaded, readyState:', document.readyState);
    setupObservers();
  }

})();
