# Convex Auth Setup Research & Troubleshooting

## Research Findings

### 1. HTTP Router Configuration
Based on Convex auth documentation:
- The HTTP router must be exported as `default export` from `convex/http.ts`
- The file must be named exactly `http.ts` in the `convex/` directory
- Routes are automatically registered when `auth.addHttpRoutes(http)` is called

### 2. Callback URL Format
According to Convex auth docs:
- **Format**: `https://<deployment>.convex.site/api/auth/callback/<provider>`
- **Example**: `https://modest-wombat-281.convex.site/api/auth/callback/google`
- Note: Documentation mentions `.convex.site` but actual deployments use `.convex.cloud`

### 3. Environment Variables Required
- `AUTH_GOOGLE_CLIENT_ID` - Set in Convex (✅ Done)
- `AUTH_GOOGLE_CLIENT_SECRET` - Set in Convex (✅ Done)
- `CUSTOM_AUTH_SITE_URL` - Optional, overrides default site URL (✅ Set)
- `CONVEX_SITE_URL` - Built-in, cannot be overridden

### 4. Google OAuth Console Configuration
**Authorized JavaScript origins:**
- `https://modest-wombat-281.convex.cloud`
- `http://localhost:3000` (for local dev)
- `http://localhost:3002` (for local dev)

**Authorized redirect URIs:**
- `https://modest-wombat-281.convex.cloud/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3002/api/auth/callback/google`

### 5. Common Issues & Solutions

#### Issue: 404 on `/api/auth/signin/google`
**Possible Causes:**
1. HTTP router not deployed
2. HTTP router not exported correctly
3. Routes not registered properly
4. Deployment URL mismatch

**Solutions to Try:**
1. Verify `convex/http.ts` exists and exports default
2. Restart Convex dev server: `npx convex dev`
3. Check Convex dashboard logs for errors
4. Verify environment variables are set correctly
5. Try deploying: `npx convex deploy`

#### Issue: redirect_uri_mismatch
**Solution:**
- Ensure redirect URI in Google Console matches exactly (including protocol, domain, path)
- No trailing slashes
- Exact case matching
- Wait 5-10 minutes after saving in Google Console

## Current Configuration Status

✅ **HTTP Router**: `convex/http.ts` exists and looks correct
✅ **Auth Config**: `convex/auth.ts` has Google provider configured
✅ **Environment Variables**: All required vars set in Convex
✅ **Google Console**: Redirect URIs configured

❌ **Issue**: 404 error on `/api/auth/signin/google`

## Next Steps to Debug

1. **Check Convex Dashboard Logs**
   - Go to https://dashboard.convex.dev
   - Check for HTTP route registration errors
   - Look for authentication-related errors

2. **Verify HTTP Router Deployment**
   - Check if `convex/http.ts` is being picked up by Convex
   - Verify no TypeScript errors preventing deployment

3. **Test Route Registration**
   - Try accessing other HTTP routes if any exist
   - Check if HTTP router is actually being deployed

4. **Alternative: Check Route Path**
   - The route might be at a different path
   - Try: `/api/auth/callback/google` instead of `/api/auth/signin/google`
   - The signin might redirect to Google first, then callback handles the response

## Key Insight

The error shows:
```
GET https://modest-wombat-281.convex.cloud/api/auth/signin/google?code=...
404 (Not Found)
```

This suggests:
- The OAuth flow started (Google redirected back with a code)
- But the Convex endpoint to handle it doesn't exist
- This could mean:
  1. HTTP routes aren't deployed
  2. Route path is incorrect
  3. HTTP router export isn't working

## Recommended Fix

1. **Kill all Convex dev processes** and restart fresh
2. **Check Convex dashboard** for deployment status
3. **Verify HTTP router** is being picked up (check logs)
4. **Try explicit route registration** if needed
5. **Check if routes need to be at different path** (e.g., `/auth/signin/google` vs `/api/auth/signin/google`)

