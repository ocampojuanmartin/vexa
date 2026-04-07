# Vexa — Your practice, streamlined

Practice management platform for law firms.

## Setup Instructions

### 1. Install Node.js
Download and install Node.js from https://nodejs.org (use the LTS version).

### 2. Install dependencies
Open a terminal, navigate to this folder, and run:
```
npm install
```

### 3. Configure environment variables
Copy the example env file:
```
cp .env.local.example .env.local
```
Then open `.env.local` and fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://mpxeyqkdaxszmmzyciwn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key-here
```

### 4. Run locally
```
npm run dev
```
Open http://localhost:3000 in your browser.

### 5. Deploy to Vercel
1. Create a GitHub account at https://github.com
2. Create a new repository called `vexa`
3. Push this code to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/vexa.git
   git push -u origin main
   ```
4. Go to https://vercel.com and sign up with GitHub
5. Click "Import Project" and select your `vexa` repo
6. In the Environment Variables section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your publishable key
7. Click Deploy

### 6. Create your first admin user
After deploying, you need to create the first firm and admin user manually.
See the step-by-step guide provided with this project.
