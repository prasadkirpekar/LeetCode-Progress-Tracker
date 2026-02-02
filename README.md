# LeetCode Progress Tracker

A Chrome extension that automatically tracks your LeetCode problem-solving activity and provides AI-powered insights to help you improve.

## Features

### Automatic Tracking
- Monitors your activity on LeetCode problem pages
- Captures every run and submission attempt
- Records pass/fail status, test case results, runtime, memory usage
- Stores failed test case details, expected vs actual output, and error messages

### Dashboard Overview
- Total problems attempted and solved
- Success rate statistics
- Difficulty breakdown (Easy/Medium/Hard)
- Recent activity timeline

### AI-Powered Insights
- Generate personalized learning recommendations using OpenAI
- Identify strengths and weaknesses in your problem-solving
- Get specific problems to practice based on your patterns
- Analyze individual problems for targeted advice

### Problem Management
- View all attempted problems sorted by recency
- Detailed attempt history for each problem
- Filter by difficulty, status, and tags
- Export/Import your progress data

## Installation

### Load Unpacked Extension (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `LeetCodeTracker` folder
6. The extension icon should appear in your toolbar

## Usage

### Tracking Problems
1. Navigate to any LeetCode problem page (e.g., `leetcode.com/problems/two-sum`)
2. The extension automatically starts tracking
3. Run or submit your code - attempts are recorded automatically
4. Click the extension icon to view your progress

### Viewing Statistics
1. Click the extension icon
2. **Overview Tab**: See your overall stats and recent activity
3. **Insights Tab**: View improvement suggestions and AI insights
4. **Problems Tab**: Browse all tracked problems with detailed histories

### AI Features Setup

1. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Click the extension icon and go to **Settings**
3. Enter your API key and click **Save**
4. Use **Test Connection** to verify it works
5. Toggle **Enable AI Insights** to activate AI features

### Generating AI Insights

1. Go to the **Insights** tab
2. Click **Generate AI Insights**
3. Wait for the AI to analyze your progress
4. Review personalized recommendations

### Analyzing Individual Problems

1. Go to the **Problems** tab
2. Click on any problem to view details
3. Click **Analyze with AI** for specific advice on that problem

### Data Management

- **Export Progress**: Download your data as a JSON file
- **Import Progress**: Restore from a previously exported file
- **Clear All Data**: Reset the extension (irreversible)

## How It Works

### Technical Details

1. **Content Script**: Injects into LeetCode pages and intercepts fetch requests to capture run/submit data
2. **Background Service Worker**: Manages IndexedDB storage and handles AI API calls
3. **Popup UI**: Displays statistics and provides user interface for settings

### Data Captured

For each attempt, the extension records:
- Timestamp
- Type (run or submit)
- Pass/fail status
- Test cases passed/total
- Runtime and memory usage
- Failed test case input
- Expected vs actual output
- Compile errors
- Runtime errors

### Storage

All data is stored locally in your browser using IndexedDB:
- No external servers (except OpenAI when you request AI features)
- Your data never leaves your device unless you export it
- API keys are encrypted before storage

## Privacy & Security

- **100% Local Storage**: All tracking data stays on your device
- **No Telemetry**: The extension doesn't send data anywhere
- **Encrypted API Keys**: OpenAI keys are encrypted using Web Crypto API
- **User-Initiated AI Calls**: AI features only activate when you click the button
- **Open Source**: Review the code yourself

## API Costs

The extension uses OpenAI's GPT-4o-mini model for cost efficiency:
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- Typical insight generation: < $0.01

View your API usage statistics in the Settings tab.

## Troubleshooting

### Extension Not Tracking

1. Make sure you're on a LeetCode problem page (`leetcode.com/problems/*`)
2. Refresh the page after installing the extension
3. Check the browser console for errors (`F12` → Console)
4. Try disabling and re-enabling the extension

### AI Features Not Working

1. Verify your API key is saved (Settings → green checkmark)
2. Test your API key with the **Test Connection** button
3. Ensure AI features are enabled (toggle is on)
4. Check if you have API credits on OpenAI

### Data Not Saving

1. Clear browser cache and reload
2. Check if IndexedDB is enabled in your browser
3. Try exporting data and re-importing

### Missing Problem Information

Sometimes LeetCode's page structure varies:
- Title/difficulty might not be extracted correctly
- Tags may be incomplete
- The extension will still track attempts with available data

## File Structure

```
LeetCodeTracker/
├── manifest.json      # Extension configuration
├── background.js      # Service worker
├── content.js         # Page injection script
├── popup.html         # UI markup
├── popup.js           # UI logic
├── db.js              # IndexedDB wrapper
├── api.js             # OpenAI integration
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Browser Support

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium browsers may work but are not tested

## Contributing

Feel free to submit issues and pull requests for:
- Bug fixes
- New features
- Documentation improvements
- UI enhancements

## License

MIT License - Feel free to use and modify as needed.

## Disclaimer

This extension is not affiliated with LeetCode. Use at your own discretion. The extension only reads publicly available information from pages you visit.
