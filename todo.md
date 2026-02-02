```
I need you to create a Chrome extension called "LeetCode Progress Tracker" that monitors LeetCode problem-solving activity and provides AI-powered insights. Here are the complete requirements:

## CORE FUNCTIONALITY

### 1. Automatic Tracking
- Monitor when users are on LeetCode problem pages (leetcode.com/problems/*)
- Intercept fetch requests to LeetCode's API endpoints to capture:
  - Run code requests: /problems/{slug}/interpret_solution/
  - Submit requests: /problems/{slug}/submit/
  - Result checking: /submissions/detail/{id}/check/
- For each run/submission, capture and store:
  - Timestamp (ISO format)
  - Type (run or submit)
  - Problem information (title, slug, difficulty, tags)
  - Pass/fail status and status code
  - Total test cases and number passed
  - Runtime and memory statistics
  - Failed test case inputs
  - Expected vs actual output
  - Compilation errors
  - Runtime errors
  - Full judge output

### 2. Data Storage
- Use IndexedDB for unlimited local storage (not Chrome storage API)
- Store data structure:
```javascript
{
  problems: {
    "problem-slug": {
      title: string,
      slug: string,
      difficulty: "Easy" | "Medium" | "Hard",
      tags: string[],
      attempts: [
        {
          timestamp: ISO string,
          type: "run" | "submit",
          passed: boolean,
          status: string,
          statusCode: number,
          totalCorrect: number,
          totalTestcases: number,
          runtime: string,
          memory: string,
          failedTestcase: string,
          expectedOutput: string,
          codeOutput: string,
          compileError: string,
          runtimeError: string
        }
      ],
      firstAttempt: ISO string,
      solved: boolean,
      solvedAt: ISO string (if solved)
    }
  },
  settings: {
    openaiApiKey: string (encrypted),
    aiEnabled: boolean,
    apiUsageStats: {
      totalCalls: number,
      totalTokens: number,
      estimatedCost: number
    }
  }
}
```

### 3. Problem Information Extraction
Extract from LeetCode page DOM:
- Problem title from: [data-cy="question-title"] or .text-title-large
- Difficulty from: [diff] or .text-difficulty-easy/medium/hard
- Problem slug from URL path
- Tags from: [class*="topic-tag"] elements

## USER INTERFACE

### Popup Dashboard (popup.html + popup.js)
Create a modern dark theme UI with 4 tabs:

**Tab 1: Overview**
- Display stat cards in 2x2 grid:
  - Total Problems Attempted
  - Total Solved
  - Total Attempts
  - Success Rate %
- Difficulty breakdown (Easy/Medium/Hard with solve rates)
- Recent Activity list (last 5 attempts with problem name, status, time ago)

**Tab 2: Insights**
- AI-Powered Insights section (button: "Generate AI Insights")
- Improvement Points list showing:
  - Current solve rate by difficulty
  - Pattern detection (TLE, runtime errors, wrong answers)
  - Topics needing improvement
  - Average attempts per problem
- Problems Needing Attention (problems with 3+ failed attempts)
- Suggested Topics to Practice (based on low success rate)

**Tab 3: Problems**
- List all attempted problems sorted by most recent
- For each problem show:
  - Title and difficulty badge (color-coded)
  - Number of attempts
  - Solved/Unsolved status badge
  - First 3 topic tags
- Click on problem to view detailed attempt history with:
  - Back button to problem list
  - Problem metadata (title, difficulty, tags, dates)
  - Full attempt timeline (newest first) showing:
    - Run/Submit icon
    - Timestamp
    - Status with color coding
    - Failed test case details
    - Test case pass ratio

**Tab 4: Settings**
- OpenAI API Key section:
  - Input field for API key (password type)
  - Save button
  - Test connection button
  - Key status indicator (saved/not saved)
- AI Features toggle
- API Usage Statistics display:
  - Total API calls made
  - Total tokens used
  - Estimated cost ($)
  - Reset stats button
- Data Management:
  - Export Progress button (downloads JSON)
  - Import Progress button (file upload)
  - Clear All Data button (with confirmation)

### Design Requirements
- Modern dark theme (#1a1a1a background, #e0e0e0 text)
- Gradient header (purple gradient: #667eea to #764ba2)
- Card-based layout with rounded corners
- Color coding:
  - Easy: Green (#4ade80)
  - Medium: Yellow (#fbbf24)
  - Hard: Red (#f87171)
  - Passed: Green
  - Failed: Red
- Smooth transitions and hover effects
- Custom scrollbar styling
- Responsive popup width: 450px, min-height: 500px

## AI INTEGRATION

### OpenAI API Implementation
Use OpenAI GPT-4o-mini model for cost efficiency:

**Feature 1: Generate Insights**
When user clicks "Generate AI Insights":
- Prepare summary of user's progress data
- Send to OpenAI API with prompt:
```
Analyze this LeetCode progress data and provide:
1. Key strengths and weaknesses
2. Specific algorithmic concepts to study
3. Learning path recommendations
4. 5 specific LeetCode problems to solve next (with explanations why)

Data: {JSON summary of problems, attempts, patterns}
```
- Display formatted response in Insights tab
- Track API usage (tokens, cost)

**Feature 2: Analyze Problem** (stretch goal)
Add "Analyze with AI" button on problem detail view:
- Send problem attempts data to OpenAI
- Ask for specific advice on why user is failing
- Suggest optimization strategies

**Cost Estimation:**
- Display estimated cost before API call
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Show running total in settings

### API Key Security
- Encrypt API key before storing in IndexedDB
- Use Web Crypto API for encryption
- Never log or expose the key
- Clear from memory after use

## FILE STRUCTURE

Create these files:

1. **manifest.json** (Manifest V3)
   - Name: "LeetCode Progress Tracker"
   - Version: 1.0
   - Permissions: storage, webRequest
   - Host permissions: https://leetcode.com/*
   - Content script for /problems/* pages
   - Background service worker
   - Popup action with icons

2. **content.js**
   - Inject into LeetCode problem pages
   - Override window.fetch to intercept API calls
   - Extract problem information from DOM
   - Send captured data to background script via chrome.runtime.sendMessage
   - Handle pagination/polling for submission results

3. **background.js**
   - Service worker for data persistence
   - Handle messages from content script
   - Manage IndexedDB operations (create, read, update)
   - Generate analytics and insights
   - Handle OpenAI API calls
   - Export/Import functionality

4. **popup.html**
   - Clean, modern UI structure
   - 4 tabs: Overview, Insights, Problems, Settings
   - Dark theme styling
   - All styles inline in <style> tag

5. **popup.js**
   - Tab switching logic
   - Load data from IndexedDB via background script
   - Render statistics, charts, problem lists
   - Handle user interactions (clicks, exports, API calls)
   - Format dates/times (show "5m ago", "2h ago", etc.)

6. **db.js** (IndexedDB wrapper)
   - Initialize database with object stores
   - CRUD operations for problems
   - Settings management
   - Export to JSON
   - Import from JSON

7. **api.js** (OpenAI integration)
   - OpenAI API call wrapper
   - Token counting
   - Cost calculation
   - Error handling
   - Rate limiting

8. **Icons** (icon16.png, icon48.png, icon128.png)
   - Create simple icons with "LC" text on purple gradient background

9. **README.md**
   - Installation instructions (load unpacked)
   - Feature list
   - How it works (technical details)
   - Privacy policy (all local, no servers)
   - OpenAI API setup guide
   - Troubleshooting
   - Future enhancements

## TECHNICAL REQUIREMENTS

### Content Script Implementation
```javascript
// Override fetch to intercept LeetCode API calls
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const clonedResponse = response.clone();
  
  // Check if this is a run/submit endpoint
  // Parse response and extract data
  // Send to background script
  
  return response;
};
```

### IndexedDB Schema
```javascript
// Database: leetcode-tracker
// Version: 1
// Object Stores:
// - problems (keyPath: slug)
// - settings (keyPath: key)
// - apiUsage (keyPath: timestamp)
```

### Data Analysis Logic
Calculate and display:
- Overall success rate (solved / total)
- Success rate by difficulty
- Most failed problems
- Failure pattern detection:
  - Count TLE errors (status code 14)
  - Count runtime errors
  - Count wrong answers
- Topic performance (group by tags)
- Average attempts before solving

### Export/Import
- Export: Serialize entire IndexedDB to JSON file
- Import: Parse JSON and restore to IndexedDB
- Merge strategy: Ask user if they want to merge or replace

## ERROR HANDLING

- Handle LeetCode API changes gracefully
- Validate API responses before storing
- Show user-friendly error messages
- Console logging for debugging
- Handle missing DOM elements
- Handle invalid OpenAI API keys
- Handle network failures

## PRIVACY & SECURITY

- All data stored locally in browser
- No external servers or telemetry
- OpenAI API key encrypted at rest
- API calls only when user explicitly requests
- Inform user their API key is used for OpenAI calls
- Clear privacy statement in README

## OPTIONAL ENHANCEMENTS

If time permits, add:
- Progress charts (line chart of solved problems over time)
- Heatmap calendar (like GitHub contribution graph)
- Problem similarity suggestions
- Study session timer
- Custom goals and milestones
- Dark/Light theme toggle

## DELIVERABLES

Provide:
1. Complete working Chrome extension (all files)
2. Detailed README with screenshots/examples
3. Installation guide
4. Usage instructions
5. Code comments explaining key functionality

Make sure the extension works with current LeetCode website (January 2025) and handles both old and new LeetCode UI gracefully.
```