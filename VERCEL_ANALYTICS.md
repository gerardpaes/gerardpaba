# Vercel Web Analytics Setup

This document explains how Vercel Web Analytics is integrated into this project and how to enable it.

## Overview

Vercel Web Analytics is a lightweight web analytics solution that tracks page views and user interactions on your website. It's already integrated into this project's HTML file and will automatically start collecting data once deployed to Vercel.

## Prerequisites

- A Vercel account (sign up at https://vercel.com/signup if you don't have one)
- This project deployed on Vercel (create a new project at https://vercel.com/new if needed)
- The Vercel CLI installed (optional, for local deployment):
  ```bash
  npm i vercel
  # or with pnpm/yarn/bun
  pnpm i vercel
  yarn i vercel
  bun i vercel
  ```

## Implementation

### Current Setup

The Vercel Web Analytics tracking script has been added to `index.html` in the `<head>` section:

```html
<!-- Vercel Web Analytics -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

This script:
1. Creates a global `window.va` function for tracking events
2. Defers loading the actual analytics script from Vercel's infrastructure
3. Requires no external package installation for plain HTML sites

### Enabling Web Analytics in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Analytics** tab
4. Click **Enable** from the dialog

> **Note:** Enabling Web Analytics will add new routes (scoped at `/_vercel/insights/*`) after your next deployment.

### Deploying to Vercel

Deploy your app using the Vercel CLI:

```bash
vercel deploy
```

Alternatively, if you've connected your Git repository to Vercel, simply push your changes to your main branch and Vercel will automatically deploy them.

### Verification

After deployment, you should see analytics data being collected. To verify the integration is working:

1. Visit your deployed website
2. Open your browser's Developer Tools (F12 or Cmd+Option+I)
3. Go to the Network tab
4. Look for a request to `/_vercel/insights/view`

If you see this request, the analytics are working correctly.

## Viewing Your Data

Once your site is deployed and users have visited it:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Analytics** tab
4. View your data including:
   - Page views
   - Visitor count
   - Geographic distribution
   - Device information
   - Top pages

After a few days of visitor traffic, you can start exploring and filtering the data.

## Plain HTML vs. Framework-Specific Implementations

This project uses the plain HTML implementation because it's a standalone HTML site. This means:

**Advantages:**
- No need to install the `@vercel/analytics` package
- Simple, lightweight integration
- Works with any HTML site

**Limitations:**
- No automatic route support (manual tracking required for single-page applications)
- For dynamic route tracking, use custom events

## Custom Events

Currently, this implementation tracks basic page views automatically. If you need to track specific user interactions (button clicks, form submissions, purchases, etc.), you can use custom events:

```javascript
// Example: Track a button click
document.getElementById('myButton').addEventListener('click', function() {
  window.va('event', { name: 'button_click' });
});
```

For more information on custom events, see the [Custom Events Documentation](https://vercel.com/docs/analytics/custom-events).

## Next Steps

- Monitor your analytics data in the Vercel Dashboard
- Explore the [Analytics Documentation](https://vercel.com/docs/analytics)
- Learn about [Privacy and Compliance](https://vercel.com/docs/analytics/privacy-policy)
- Review [Analytics Pricing and Limits](https://vercel.com/docs/analytics/limits-and-pricing)
- Check [Troubleshooting Guide](https://vercel.com/docs/analytics/troubleshooting) if you encounter issues

## Support

If you encounter any issues:

1. Check the [Troubleshooting Guide](https://vercel.com/docs/analytics/troubleshooting)
2. Review your browser console for errors
3. Ensure your site is deployed on Vercel with Analytics enabled
4. Contact Vercel Support through your dashboard

## References

- [Vercel Web Analytics Documentation](https://vercel.com/docs/analytics)
- [Getting Started Guide](https://vercel.com/docs/analytics/getting-started)
- [Privacy Policy](https://vercel.com/docs/analytics/privacy-policy)
