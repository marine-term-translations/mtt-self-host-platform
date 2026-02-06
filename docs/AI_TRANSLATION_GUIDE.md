# AI Translation Guide

This guide explains how to enable and use AI-powered translation suggestions in the Marine Term Translations platform.

---

## Table of Contents

- [Overview](#overview)
- [Getting Your OpenRouter API Key](#getting-your-openrouter-api-key)
- [Configuring Your API Key](#configuring-your-api-key)
- [Using AI Translation Features](#using-ai-translation-features)
- [Pricing and Free Tier](#pricing-and-free-tier)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

The Marine Term Translations platform integrates with [OpenRouter](https://openrouter.ai/) to provide AI-powered translation suggestions. This feature helps translators by:

- Generating initial translation suggestions for marine scientific terms
- Providing context-aware translations using state-of-the-art language models
- Accelerating the translation workflow while maintaining quality control

**Important**: Each user must configure their own OpenRouter API key to use AI translation features. Your API key is encrypted and stored securely, accessible only to you.

---

## Getting Your OpenRouter API Key

Follow these steps to obtain your free OpenRouter API key:

### Step 1: Create an OpenRouter Account

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Click **"Sign Up"** in the top right corner
3. Create an account using:
   - Google account
   - GitHub account
   - Email and password

### Step 2: Access Your API Keys

1. After signing in, click on your profile icon in the top right
2. Select **"Keys"** from the dropdown menu, or go directly to:
   - [https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)

### Step 3: Create a New API Key

1. On the Keys page, click **"Create Key"**
2. Give your key a descriptive name (e.g., "Marine Term Translations")
3. (Optional) Set a spending limit to control costs
4. Click **"Create"**
5. **Copy your API key** - it will look like: `sk-or-v1-...`

⚠️ **Important**: Save your API key somewhere safe. You won't be able to see it again after closing the dialog!

### Step 4: (Optional) Add Credits

OpenRouter provides free tier access to certain models, but you may want to add credits for:

- Access to more powerful models
- Higher rate limits
- Guaranteed availability

To add credits:
1. Go to [OpenRouter Settings](https://openrouter.ai/settings)
2. Click **"Credits"**
3. Add credits via credit card or cryptocurrency

---

## Configuring Your API Key

Once you have your OpenRouter API key, configure it in the platform:

### Step 1: Navigate to Settings

1. Log in to the Marine Term Translations platform
2. Click on your profile icon or username in the top right
3. Select **"Settings"** from the menu

### Step 2: Configure API Key

1. Scroll down to the **"AI Translation Settings"** section
2. You'll see a field labeled "OpenRouter API Key"
3. Paste your API key into the input field
4. Click the **eye icon** to verify you've entered it correctly (optional)
5. Click **"Save Key"**

✅ You should see a success message: "API key saved successfully!"

### Step 3: Verify Configuration

After saving, you should see a green status box indicating:

```
✅ API Key Configured
You can now use AI translation features in term details and translation flow.
```

Your API key is now:
- ✅ Encrypted using AES-256-GCM encryption
- ✅ Stored securely in the database
- ✅ Accessible only to you

---

## Using AI Translation Features

Once your API key is configured, AI translation features become available throughout the platform.

### In Term Detail Page

1. Navigate to any term that needs translation
2. Select your target language
3. Look for the **"✨ AI Suggest"** button next to each translatable field
4. Click the button to generate an AI translation suggestion
5. Review the suggestion and:
   - Accept it as-is by submitting
   - Modify it before submitting
   - Discard it and write your own translation

### In Translation Flow

1. Start a translation task from the Translation Flow page
2. Select your target language
3. The **"✨ AI Suggest"** button appears next to the translation input
4. Click to generate a suggestion
5. Review, modify if needed, and submit

### Best Practices

- **Always review AI suggestions**: AI translations are suggestions, not final translations
- **Verify scientific accuracy**: Ensure marine scientific terminology is correctly translated
- **Maintain consistency**: Check that translations align with existing terminology in the platform
- **Provide context**: The AI uses the term's definition and context to generate better translations

---

## Pricing and Free Tier

### Free Tier Models

OpenRouter provides access to several free models that the platform automatically uses:

- Models with `:free` suffix in their ID
- No credit card required for basic usage
- Subject to rate limits and availability

### Paid Models

If you add credits to your OpenRouter account:

- Access to more powerful models (GPT-4, Claude, etc.)
- Higher rate limits
- Priority access during high-demand periods

### Cost Control

OpenRouter allows you to:

1. **Set spending limits** on your API keys
2. **Monitor usage** in your OpenRouter dashboard
3. **Receive alerts** when approaching limits

**Typical costs** (as of 2026):
- Free tier models: $0.00 per request
- Most paid models: $0.001 - $0.01 per translation

Check current pricing at: [OpenRouter Pricing](https://openrouter.ai/docs#models)

---

## Troubleshooting

### AI Suggest Button Not Visible

**Possible causes:**

1. ✗ **No API key configured**
   - Solution: Configure your OpenRouter API key in Settings

2. ✗ **API key not saved properly**
   - Solution: Re-enter and save your API key
   - Verify you see the green "API Key Configured" status

3. ✗ **Not logged in**
   - Solution: Ensure you're logged in with your ORCID account

### "Failed to generate AI suggestion" Error

**Possible causes:**

1. ✗ **Invalid API key**
   - Solution: Verify your API key is correct
   - Create a new key if needed

2. ✗ **Rate limit exceeded**
   - Solution: Wait a few minutes and try again
   - Consider adding credits for higher limits

3. ✗ **No free models available**
   - Solution: Add credits to your OpenRouter account
   - Try again later when free models are available

### "Please configure your OpenRouter API key" Message

This means you haven't configured your API key yet. Follow the [Configuring Your API Key](#configuring-your-api-key) section above.

### API Key Security Concerns

**Q: Can other users see my API key?**
- A: No. Your API key is encrypted and only accessible to you.

**Q: Can administrators see my API key?**
- A: Administrators cannot see your decrypted API key. It's stored encrypted in the database.

**Q: What if I want to delete my API key?**
- A: Go to Settings → AI Translation Settings → Click "Delete Key"

---

## FAQ

### Q: Is an OpenRouter API key required to use the platform?

**A:** No, the platform works fully without an API key. AI translation features are optional and only available to users who configure their own API key.

### Q: Can I share my API key with other users?

**A:** We don't recommend sharing API keys. Each user should create their own free OpenRouter account and API key. This ensures:
- Usage tracking per user
- Individual spending control
- Better security

### Q: What happens if I run out of credits?

**A:** If you're using free tier models, they remain available (subject to rate limits). If you're using paid models and run out of credits:
1. Paid model requests will fail
2. Free tier models will still work
3. Add more credits to restore paid model access

### Q: Can I use multiple API keys?

**A:** Currently, each user can configure one API key at a time. You can change your key anytime in Settings.

### Q: How accurate are AI translation suggestions?

**A:** AI translation accuracy varies:
- Generally good for common marine scientific terms
- May require review for:
  - Highly specialized terminology
  - Context-specific translations
  - Regional language variations

**Always review and verify AI suggestions before submitting.**

### Q: Does the platform store my OpenRouter credentials?

**A:** The platform only stores your API key (encrypted). Your OpenRouter account password is never stored or requested.

### Q: Can I disable AI translation features?

**A:** Yes, simply delete your API key from Settings. The AI Suggest buttons will disappear.

---

## Need Help?

If you encounter issues not covered in this guide:

1. **Check OpenRouter Status**: [OpenRouter Status Page](https://status.openrouter.ai/)
2. **OpenRouter Documentation**: [OpenRouter Docs](https://openrouter.ai/docs)
3. **Platform Issues**: Contact your platform administrator

---

## Related Documentation

- [docs/SETUP.md](SETUP.md) - Platform setup and configuration
- [USER_API_KEY_IMPLEMENTATION.md](../USER_API_KEY_IMPLEMENTATION.md) - Technical implementation details
- [OpenRouter Documentation](https://openrouter.ai/docs) - Official OpenRouter API documentation
