# OAuth 404 Error - Debugging Steps

## The Problem
Google is redirecting to: `/api/auth/signin/google?code=...` (404 error)
Should redirect to: `/api/auth/callback/google?code=...`

## Critical Check: Browser Network Tab

**This is the most important step!**

1. Open Browser DevTools (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. **Clear** the network log
4. Click "Sign in with Google"
5. **Before** you get redirected to Google, look for a request to:
   - `modest-wombat-281.convex.cloud` (the initial signin request)
   - Look for the response - it should contain a `redirect` field with the Google OAuth URL
6. **Click on that request** and check:
   - **Response** tab - look for a JSON response with a `redirect` field
   - The `redirect` field should contain a URL like: `https://accounts.google.com/o/oauth2/v2/auth?...`
   - **In that URL, find the `redirect_uri` parameter**
   - **What is the value of `redirect_uri`?**

## Expected vs Actual

**Expected redirect_uri:**
```
https://modest-wombat-281.convex.cloud/api/auth/callback/google
```

**If it's different (especially if it says `/signin/` instead of `/callback/`), that's the problem!**

## Possible Solutions

### If redirect_uri is wrong:
1. Check `CUSTOM_AUTH_SITE_URL` environment variable
2. Verify it's set to: `https://modest-wombat-281.convex.cloud` (no trailing slash)
3. Restart Convex dev server

### If redirect_uri is correct but Google still redirects wrong:
1. Google might be using a cached redirect URI
2. Try in **Incognito/Private mode**
3. Clear browser cache
4. Wait 10-15 minutes after changing Google Console settings

### If routes aren't working:
1. Check Convex dashboard → Functions → HTTP Routes
2. Verify both routes exist:
   - `GET /api/auth/signin/*`
   - `GET /api/auth/callback/*`
3. If missing, restart Convex dev: `npx convex dev`

## Next Steps

**Please check the browser Network tab and tell me:**
1. What is the `redirect_uri` value in the OAuth request to Google?
2. Is it `/api/auth/callback/google` or `/api/auth/signin/google`?

This will tell us if the problem is:
- Convex sending wrong redirect_uri → Fix environment/config
- Google using wrong redirect_uri → Fix Google Console/cache

