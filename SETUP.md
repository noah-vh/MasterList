# Convex Setup Troubleshooting

If you're getting the error "InvalidProjectCreation: Project cannot be created or modified", try these steps:

## Step 1: Check Authentication

1. Try logging out and back in:
   ```bash
   npx convex logout
   npx convex dev
   ```
   This will prompt you to log in again.

## Step 2: Try Different Project Name

The project name "MasterList" might already exist. Try:
```bash
npx convex dev
```
When prompted, use a different project name like:
- `master-list-app`
- `masterlist-app`
- `my-master-list`

## Step 3: Check Convex Account

1. Visit https://dashboard.convex.dev
2. Log in and check:
   - Your account status
   - If you have any project limits
   - If billing is set up (if required)

## Step 4: Use Existing Project

If you already have a Convex project, you can link to it:
```bash
npx convex dev
```
Then select "use an existing project" instead of "create a new project"

## Step 5: Manual Configuration

If automatic setup fails, you can manually create `convex.json`:

1. Go to https://dashboard.convex.dev
2. Create a new project there
3. Copy the project URL
4. Create `convex.json` in your project root:
   ```json
   {
     "project": "your-project-name",
     "team": "your-team-name"
   }
   ```
5. Set the deployment URL in `.env.local`:
   ```
   VITE_CONVEX_URL=https://your-project-name.convex.cloud
   ```

## Step 6: Set OpenRouter API Key

Once Convex is set up, set your OpenRouter API key:
```bash
npx convex env set OPENROUTER_API_KEY your-api-key-here
```

## Alternative: Use Local Development

If cloud deployment is causing issues, you can use local development:
```bash
npx convex dev --once --configure new
# When prompted, choose "local dev deployment"
```

This runs Convex locally without needing cloud setup.

