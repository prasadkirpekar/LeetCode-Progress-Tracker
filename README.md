# LeetCode Progress Tracker

A Chrome extension that automatically tracks your LeetCode problem-solving activity locally.

[Download from Chrome store](https://chromewebstore.google.com/detail/leetcode-progress-tracker/inhpllaegcinnlokckfhmpcnjgfdmnap)

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

### Insights
- Solve rate by difficulty level
- Common failure patterns (TLE, Runtime Error, Wrong Answer, Compile Error)
- Average attempts per problem
- Problems needing attention (3+ failed attempts)

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
3. **Insights Tab**: View performance summary and problems needing attention
4. **Problems Tab**: Browse all tracked problems with detailed histories

### Data Management
- **Export Progress**: Download your data as a JSON file
- **Import Progress**: Restore from a previously exported file (merge or replace)
- **Clear All Data**: Reset the extension (irreversible)

## How It Works

### Technical Details

1. **Content Script**: Injects into LeetCode pages and intercepts fetch requests to capture run/submit data
2. **Injected Script**: Runs in the page context to intercept API calls
3. **Background Service Worker**: Manages IndexedDB storage
4. **Popup UI**: Displays statistics and provides user interface

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
- No external servers
- Your data never leaves your device unless you export it
- 100% offline functionality

## Privacy & Security

- **100% Local Storage**: All tracking data stays on your device
- **No Telemetry**: The extension doesn't send data anywhere
- **Open Source**: Review the code yourself

## Troubleshooting

### Extension Not Tracking

1. Make sure you're on a LeetCode problem page (`leetcode.com/problems/*`)
2. Refresh the page after installing the extension
3. Check the browser console for errors (`F12` → Console)
4. Try disabling and re-enabling the extension

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
├── content.js         # Content script
├── injected.js        # Page context script
├── popup.html         # UI markup
├── popup.js           # UI logic
├── db.js              # IndexedDB wrapper
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

## License

MIT License - Feel free to use and modify as needed.

## Disclaimer

This extension is not affiliated with LeetCode. Use at your own discretion. The extension only reads publicly available information from pages you visit.
