<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Master List - Task Management App

A full-stack task management application built with React, Convex, and OpenRouter AI.

## Features

- AI-powered task extraction from natural language
- Smart filtering and view generation
- Tag-based organization
- Persistent data storage with Convex

## Run Locally

**Prerequisites:** Node.js

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Initialize Convex (first time only):
   ```bash
   npx convex dev
   ```
   This will:
   - Create a Convex account if needed
   - Generate the `convex/_generated` folder
   - Provide you with a deployment URL

3. Set environment variables:
   - Create `.env.local` file in the root directory
   - Add your Convex deployment URL:
     ```
     VITE_CONVEX_URL=https://your-project.convex.cloud
     ```
   - Set your OpenRouter API key in Convex:
     ```bash
     npx convex env set OPENROUTER_API_KEY your-openrouter-api-key-here
     ```

4. Run the development servers:
   - Terminal 1 (Convex backend):
     ```bash
     npm run dev:convex
     ```
   - Terminal 2 (Vite frontend):
     ```bash
     npm run dev
     ```

5. Open your browser to `http://localhost:3000`

## Deploy to Vercel

### Prerequisites
- A Vercel account
- Your Convex project set up (see Setup step 2)
- OpenRouter API key set in Convex (see Setup step 3)

### Deployment Steps

1. **Push your code to GitHub** (if not already done)

2. **Import your project to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Set Environment Variables in Vercel:**
   - In your Vercel project settings, go to "Environment Variables"
   - Add the following variable:
     - **Name:** `VITE_CONVEX_URL`
       - **Value:** Your Convex deployment URL (e.g., `https://modest-wombat-281.convex.cloud`)
       - **Environment:** Production, Preview, and Development (select all)
   
   **Important:** You do NOT need to set `OPENROUTER_API_KEY` in Vercel. This is already set in Convex and runs server-side in Convex actions.
   
   **Note:** The Convex generated files (`convex/_generated`) are committed to the repository to enable Vercel builds without requiring additional environment variables.

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app
   - Your app will be live at `https://your-project.vercel.app`

### Verify Deployment

After deployment, test that:
- The app loads correctly
- You can create tasks (this tests Convex connection)
- AI task extraction works (this tests OpenRouter API via Convex)

If AI features don't work, check:
- OpenRouter API key is set in Convex: `npx convex env list`
- The API key is valid and has credits in your OpenRouter account

## Project Structure

- `convex/` - Backend functions (queries, mutations, actions)
  - `schema.ts` - Database schema
  - `tasks.ts` - Task CRUD operations
  - `ai.ts` - OpenRouter AI integration
- `components/` - React components
- `types.ts` - TypeScript type definitions

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Convex (database + serverless functions)
- **AI:** OpenRouter (Claude 3.5 Sonnet by default)
