# Debugging OAuth 404 Error

## The Problem
Google is redirecting to: `/api/auth/signin/google?code=...`
But it should redirect to: `/api/auth/callback/google?code=...`

## Where to Check Logs

### 1. Convex Dashboard Logs
1. Go to: https://dashboard.convex.dev
2. Select your project: **modest-wombat-281**
3. Click on **"Logs"** in the left sidebar
4. Look for:
   - HTTP route errors
   - Authentication errors
   - Any errors mentioning "signin" or "callback"
   - Check the timestamp around when you tried to sign in

### 2. Browser Developer Tools
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. Clear the network log
4. Try signing in with Google
5. Look for:
   - The request to `/api/auth/signin/google?code=...`
   - Check the **Request URL** - see what the full URL is
   - Check if there are any redirects happening
   - Look for the initial OAuth request to Google

### 3. Browser Console
1. Open browser DevTools
2. Go to **Console** tab
3. Look for any errors or warnings
4. Check if there are any authentication-related messages

## What to Look For

### In Convex Dashboard Logs:
- Check if HTTP routes are registered correctly
- Look for any errors about missing routes
- Check if there are errors about redirect URIs

### In Browser Network Tab:
1. **Find the initial OAuth request:**
   - Look for a request to `accounts.google.com` or `oauth2.googleapis.com`
   - Check the **Request URL** - it should contain a `redirect_uri` parameter
   - The `redirect_uri` should be: `https://modest-wombat-281.convex.cloud/api/auth/callback/google`
   - If it's different, that's the problem!

2. **Check the redirect:**
   - After Google authorization, there should be a redirect
   - The redirect URL should be: `https://modest-wombat-281.convex.cloud/api/auth/callback/google?code=...`
   - If it's redirecting to `/api/auth/signin/google` instead, that's the issue

## Possible Causes

1. **Wrong redirect_uri in OAuth request:**
   - The Convex auth library might be constructing the wrong redirect URI
   - Check if `CUSTOM_AUTH_SITE_URL` is causing issues

2. **Google using cached redirect URI:**
   - Google might be using an old redirect URI from cache
   - Try clearing browser cache or using incognito mode

3. **Multiple redirect URIs in Google Console:**
   - If you have both `/signin/` and `/callback/` URIs, Google might be using the wrong one
   - Remove any `/signin/` redirect URIs from Google Console

## Next Steps

1. **Check Browser Network Tab:**
   - Find the OAuth request to Google
   - Check what `redirect_uri` parameter is being sent
   - Share that information

2. **Check Convex Dashboard:**
   - Look at logs around the time of the sign-in attempt
   - Check for any errors

3. **Verify Google Console:**
   - Make sure you ONLY have `/api/auth/callback/google` redirect URIs
   - Remove any `/api/auth/signin/google` redirect URIs if they exist

4. **Try in Incognito Mode:**
   - This will bypass any browser cache
   - See if the issue persists

