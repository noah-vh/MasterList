# Convex Auth Setup - Email/Password Authentication

## Required Environment Variables

Convex Auth requires the following environment variable:

### JWT_PRIVATE_KEY

This is used to sign JWT tokens for authentication sessions.

## Setting JWT_PRIVATE_KEY

### Option 1: Via Convex Dashboard (Recommended)

1. Go to https://dashboard.convex.dev
2. Select your project: **modest-wombat-281**
3. Go to **Settings** → **Environment Variables**
4. Click **Add Variable**
5. Name: `JWT_PRIVATE_KEY`
6. Value: Paste the private key (see below for how to generate)
7. Click **Save**

### Option 2: Via CLI

Generate a new key:
```bash
openssl genpkey -algorithm RSA -out jwt_private_key.pem -pkeyopt rsa_keygen_bits:2048
```

Set it in Convex:
```bash
cat jwt_private_key.pem | npx convex env set JWT_PRIVATE_KEY -
```

### Option 3: Generate and Set in One Command

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 | npx convex env set JWT_PRIVATE_KEY -
```

## Verify Setup

Check that the variable is set:
```bash
npx convex env list | grep JWT_PRIVATE_KEY
```

## Current Status

✅ Password provider configured in `convex/auth.ts`
✅ Login form set up for email/password
✅ HTTP routes configured

## Testing

1. Make sure `JWT_PRIVATE_KEY` is set
2. Restart your Convex dev server: `npx convex dev`
3. Try signing up with email/password
4. If you get errors, check the Convex dashboard logs

## Troubleshooting

If you still get `Missing environment variable JWT_PRIVATE_KEY`:

1. **Verify the key is set**: `npx convex env list`
2. **Restart Convex dev server**: Stop and restart `npx convex dev`
3. **Check Convex dashboard**: Go to Settings → Environment Variables and verify it's there
4. **Try setting via dashboard**: Sometimes the CLI has issues with multiline values

## Security Note

- Never commit `JWT_PRIVATE_KEY` to git
- Keep it secure - it's used to sign authentication tokens
- If compromised, generate a new key and update it

