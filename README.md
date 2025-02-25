<div align="center">
  <img src="icons/icon128.png" alt="Now2.ai RTL Fixer Logo" width="128" height="128">
  <h1>Now2.ai RTL Fixer</h1>
</div>

## Overview

Now2.ai RTL Fixer is a Chrome extension that automatically fixes RTL (Right-to-Left) text handling in AI chat platforms. If you've ever tried typing Hebrew or other RTL languages in AI assistants, you've likely encountered issues with text alignment, mixed language display, and overall text direction. This extension solves these problems seamlessly.

## Supported Platforms

- Claude.ai
- ChatGPT
- Google Gemini
- Google NotebookLM
- Perplexity.ai

## Features

- **Automatic RTL Fixing**: Automatically detects and fixes RTL text handling issues
- **Toggle Functionality**: Easily enable or disable the extension for specific sites
- **Non-Destructive**: Applies changes without modifying your actual text content
- **Platform-Specific Optimizations**: Custom-tailored fixes for each supported platform
- **Visual Indicator**: Subtle indicator shows when RTL Fixer is active

## Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) 🔴 *(link to be added when published)*
2. Search for "Now2.ai RTL Fixer"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory

## How It Works

When you visit any of the supported AI chat platforms, RTL Fixer automatically activates and:

1. Monitors the page for text input areas and message displays
2. Applies the correct RTL handling to elements that need it
3. Shows a subtle indicator to let you know it's working
4. Maintains proper text direction even as new content loads

## Technical Details

### Text Direction Handling

RTL Fixer uses three strategies for handling text direction:

- **Auto Detection**: Perfect for mixed content (both RTL and LTR in the same element)
- **Direction Inheritance**: Maintains consistency with parent elements
- **Forced RTL**: Used when specific elements need guaranteed RTL layout

### Implementation

The extension uses:
- MutationObserver to monitor for DOM changes
- CSS isolation techniques to prevent conflicts
- Platform-specific selectors for precise targeting
- Optimized performance with minimal overhead

## Privacy & Security

RTL Fixer:
- Works entirely in your browser
- Never collects or transmits any data
- Doesn't modify your actual text content
- Can be disabled for any site with a single click

## Development

### Project Structure

```
├── dist/                # Build directory
├── icons/               # Extension icons
├── src/
│   ├── background.js    # Background script
│   ├── config/          # Configuration files
│   ├── core/            # Core functionality
│   ├── extension/       # Extension-specific code
│   ├── ui/              # User interface components
│   ├── utils/           # Utility functions
│   ├── content-script.js # Main content script
│   ├── popup.html       # Popup UI
│   └── popup.js         # Popup logic
├── .gitignore           # Git ignore file
├── LICENSE              # GNU GPL v3 license
├── manifest.json        # Extension manifest
├── package.json         # NPM package file
├── README.md            # This file
└── webpack.config.js    # Build configuration
```

### Building From Source

1. Clone the repository
2. Install all required dependencies:
   ```
   npm install webpack webpack-cli zip-webpack-plugin @babel/core babel-loader @babel/preset-env copy-webpack-plugin --save-dev
   ```
3. Build the extension:
   - For development build:
     ```
     npm run dev:build
     ```
   - For production build:
     ```
     npm run prod:build
     ```
   This creates the production build using webpack in the `dist` directory
4. For development with auto-rebuild:
   ```
   npm run dev:watch
   ```
   This runs webpack in development mode with the watch flag for automatic rebuilds

## Origin

This extension evolved from a successful bookmarklet version that gained popularity for its effectiveness. The Chrome extension format provides a better user experience with persistent settings and easier access.

## License

This extension is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support & Feedback

If you encounter any issues or have suggestions:
- Check that you're on a supported platform
- Open an issue on our GitHub repository (if available)

---

Created by [Now2.ai](https://now2.ai) - Transform Your Technology Future. Strategic technology consulting for organizations navigating the new AI-driven landscape.
