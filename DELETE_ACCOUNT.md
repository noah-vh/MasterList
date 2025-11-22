# Delete Problematic Account

You're getting `InvalidSecret` because the account `noahvanhart@pm.me` exists but has an invalid password hash (likely from OAuth testing).

## Quick Fix: Delete the Account

### Option 1: Convex Dashboard (Easiest)

1. Go to: https://dashboard.convex.dev
2. Select your project: **modest-wombat-281**
3. Go to **Functions** → **Mutations**
4. Find: `authHelpers:deleteAccountByEmail`
5. Click **Run**
6. Enter email: `noahvanhart@pm.me`
7. Click **Run**

This will delete:
- The account
- The user record
- All sessions
- All associated data

### Option 2: Use Convex CLI

```bash
npx convex run authHelpers:deleteAccountByEmail --email "noahvanhart@pm.me"
```

## After Deleting

1. Go back to your app
2. Click "Sign Up" (not Sign In)
3. Enter your email: `noahvanhart@pm.me`
4. Enter a new password (at least 8 characters)
5. Click "Sign Up"

You should now be able to create a fresh account with email/password authentication!

