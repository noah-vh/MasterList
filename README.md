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
