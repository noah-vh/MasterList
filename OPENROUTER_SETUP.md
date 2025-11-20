# OpenRouter API Setup & Troubleshooting

## Getting Your API Key

1. **Sign up/Login to OpenRouter:**
   - Go to https://openrouter.ai
   - Sign up or log in to your account

2. **Create an API Key:**
   - Go to https://openrouter.ai/keys
   - Click "Create Key"
   - Copy the key (it starts with `sk-or-v1-`)
   - **Important:** Save it immediately - you won't be able to see it again!

3. **Add Credits (if needed):**
   - Go to https://openrouter.ai/credits
   - Add credits to your account
   - Some models require credits to use

## Setting the API Key in Convex

Once you have your API key:

```bash
npx convex env set OPENROUTER_API_KEY your-api-key-here
```

Replace `your-api-key-here` with your actual key from OpenRouter.

## Verifying Your API Key

### Method 1: Test via Convex Dashboard

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to your project
3. Go to "Functions" → "Actions"
4. Find `ai:testOpenRouterKey`
5. Click "Run" to test your API key

### Method 2: Test via Terminal

You can test the API key directly using curl:

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

If successful, you'll see a list of available models. If you get a 401 error, the key is invalid.

## Common Errors & Solutions

### Error: "User not found" (401)

**Cause:** The API key is invalid, expired, or doesn't exist.

**Solutions:**
1. **Verify the key is correct:**
   - Check for typos or extra spaces
   - Make sure you copied the entire key (they're long!)

2. **Generate a new key:**
   - Go to https://openrouter.ai/keys
   - Delete the old key (if needed)
   - Create a new key
   - Update it in Convex: `npx convex env set OPENROUTER_API_KEY new-key-here`

3. **Check your account status:**
   - Make sure you're logged into the correct OpenRouter account
   - Verify your account is active (not suspended)

### Error: "Insufficient credits"

**Cause:** Your OpenRouter account doesn't have enough credits.

**Solution:**
- Go to https://openrouter.ai/credits
- Add credits to your account
- Some models require credits even for testing

### Error: "Model not found" or "Model unavailable"

**Cause:** The model specified might not be available or you don't have access.

**Solution:**
- Check available models: https://openrouter.ai/models
- The default model is `anthropic/claude-3.5-sonnet`
- You can change it by setting `OPENROUTER_MODEL` in Convex:
  ```bash
  npx convex env set OPENROUTER_MODEL openai/gpt-4
  ```

## Testing the Full Flow

Once your API key is set and verified:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Try adding a task:**
   - Type something like "Buy groceries" in the input field
   - The AI should extract the task details
   - If you see an error message, check the error details

3. **Check Convex logs:**
   - Go to your Convex dashboard
   - Check the "Logs" section for any errors
   - Look for `[CONVEX A(ai:parseUserIntent)]` entries

## Environment Variables Summary

**In Convex (required):**
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `OPENROUTER_MODEL` - (optional) Model to use, defaults to `anthropic/claude-3.5-sonnet`

**In Vercel (for deployment):**
- `VITE_CONVEX_URL` - Your Convex deployment URL

**Note:** The OpenRouter API key should ONLY be in Convex, never in Vercel or client-side code!

## Still Having Issues?

1. **Check Convex environment variables:**
   ```bash
   npx convex env list
   ```

2. **Verify the key format:**
   - Should start with `sk-or-v1-`
   - Should be very long (50+ characters)

3. **Test the key directly:**
   ```bash
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer YOUR_KEY"
   ```

4. **Check OpenRouter dashboard:**
   - Visit https://openrouter.ai/activity
   - See if there are any failed requests
   - Check your credit balance

5. **Contact Support:**
   - OpenRouter: support@openrouter.ai
   - Convex: support@convex.dev

