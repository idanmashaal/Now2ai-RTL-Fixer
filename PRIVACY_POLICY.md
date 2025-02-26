# Privacy Policy - Now2.ai RTL Fixer

## Introduction

Now2.ai RTL Fixer is a Chrome extension designed with a single purpose: fixing RTL (Right-to-Left) text issues in AI chat platforms including Claude.ai, ChatGPT, Perplexity.ai, Google Gemini, and Google NotebookLM.

This privacy policy explains how the extension works and the limited permissions it requires to function.

## No Data Collection Policy

**Important: Now2.ai RTL Fixer does not collect, transmit, or share any data whatsoever.**

- The extension does not collect any personal information
- No data is ever sent to our servers or any third parties
- All information is stored locally on your device only
- No analytics or tracking of any kind is implemented
- No network connections are made by the extension

## Local Storage Only

The extension stores only the following information locally on your device using Chrome's storage API:

1. **Site-specific preferences**: Whether the extension is enabled or disabled for each supported website.
2. **Last active timestamp**: Simple timestamp of when the extension was last used.

This information never leaves your device and is used solely to maintain your preferences between browser sessions.

## Chrome Sync

If you use Chrome's built-in sync feature, your extension preferences may sync across your devices where you're signed into Chrome. This is standard Chrome behavior and is controlled by your Chrome settings. Even in this case, no data is transmitted to Now2.ai servers.

## Automatic Removal

When you uninstall the extension, all locally stored preferences are automatically removed.

## Permissions Explained

### Storage Permission

The extension requests the `"storage"` permission to:
- Save your site-specific preferences (enabled/disabled state)
- Remember when you last used the extension

### Host Permissions

The extension requests access to specific domains:
```
"*://*.claude.ai/*",
"*://*.chatgpt.com/*",
"*://notebooklm.google.com/*",
"*://gemini.google.com/*",
"*://*.perplexity.ai/*"
```

These permissions are strictly limited to the supported AI platforms where RTL fixing is needed. The extension's code also includes validation to ensure it only activates on these specific domains.

## Text Direction Handling

The extension observes text elements on supported websites to apply RTL text handling. Important facts about this functionality:

- The extension **does not read, store, or transmit** the content of your conversations
- It only applies CSS styling to fix text direction on supported websites
- No content is saved or sent anywhere
- No content analysis is performed beyond detecting if elements need RTL handling
-

This automatic handling of RTL text provides a seamless user experience without requiring manual intervention for each text element.

## No Third-Party Services

Now2.ai RTL Fixer:
- Does not use any third-party analytics
- Does not include any tracking code
- Does not share any data with third parties
- Does not connect to any external servers
- Does not transmit any information outside your browser

## How to Verify Our Claims

The extension is open source, and you can verify our privacy claims by:
1. Examining the source code in our GitHub repository at https://github.com/idanmashaal/Now2ai-RTL-Fixer (or your actual GitHub URL)
2. Using Chrome's developer tools to monitor network activity (you'll see there are no outgoing connections)
3. Inspecting what's stored in Chrome's storage via chrome://extensions

## Changes to this Policy

If we make material changes to this privacy policy, we will notify you through the extension or by updating this document in the GitHub repository.

## Contact Information

If you have any questions or concerns about this privacy policy or the Now2.ai RTL Fixer extension, please contact us through our GitHub repository or visit [Now2.ai](https://now2.ai).

---

Last Updated: February 26, 2025

Created by [Now2.ai](https://now2.ai) - Transform Your Technology Future. Strategic technology consulting for organizations navigating the new AI-driven landscape.
