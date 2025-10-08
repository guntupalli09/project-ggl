# Project GGL - Vercel Deployment Guide

## Prerequisites

1. **Install Git** (if not already installed):
   - Download from: https://git-scm.com/downloads
   - Follow the installation wizard

2. **Install Vercel CLI** (optional but recommended):
   ```bash
   npm install -g vercel
   ```

3. **Create Vercel Account**:
   - Go to: https://vercel.com
   - Sign up with GitHub, GitLab, or email

## Deployment Steps

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Prepare your project**:
   - Ensure all files are ready in your project directory
   - The build has been tested locally (`npm run build`)

2. **Create a Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Push to GitHub**:
   - Create a new repository on GitHub
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/project-ggl.git
   git branch -M main
   git push -u origin main
   ```

4. **Deploy to Vercel**:
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite project
   - Click "Deploy"

### Method 2: Deploy via Vercel CLI

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy from project directory**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Set up and deploy? `Y`
   - Which scope? (select your account)
   - Link to existing project? `N`
   - Project name: `project-ggl`
   - Directory: `./`
   - Override settings? `N`

## Environment Variables Setup

After deployment, configure these environment variables in Vercel:

1. **Go to your project dashboard**:
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings**:
   - Click on "Settings" tab
   - Go to "Environment Variables" section

3. **Add the following variables**:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_SUPABASE_URL` | `https://rmrhvrptpqopaogrftgl.supabase.co` | Production, Preview, Development |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDI0NjIsImV4cCI6MjA3NTUxODQ2Mn0.QNQhnn2-rHuIjpKeRTSzAxVOgUQFrYg5hJ6KCPldquc` | Production, Preview, Development |
   | `VITE_OPENAI_API_KEY` | `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` | Production, Preview, Development |

4. **Redeploy**:
   - After adding environment variables, trigger a new deployment
   - Go to "Deployments" tab
   - Click "Redeploy" on the latest deployment

## Database Setup

Before using the application, run these SQL scripts in your Supabase dashboard:

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**:
   - Click on "SQL Editor" in the left sidebar

3. **Run the following scripts in order**:
   - `create_leads_table.sql`
   - `create_crm_contacts_table.sql`
   - `create_outreach_sequences_table.sql`
   - `create_roi_metrics_table.sql`
   - `create_brand_voice_table.sql`

## Post-Deployment Checklist

- [ ] Project deployed successfully to Vercel
- [ ] Environment variables configured
- [ ] Database tables created in Supabase
- [ ] Application loads without errors
- [ ] Authentication works (sign up/login)
- [ ] All features functional:
  - [ ] Dashboard with stats
  - [ ] Leads management
  - [ ] CRM contacts
  - [ ] AI message generation
  - [ ] AI sequence generation
  - [ ] Brand voice settings
  - [ ] Pipeline board with drag & drop

## Troubleshooting

### Common Issues:

1. **Build Errors**:
   - Check that all dependencies are installed: `npm install`
   - Verify TypeScript compilation: `npm run build`

2. **Environment Variables Not Working**:
   - Ensure variables are prefixed with `VITE_`
   - Redeploy after adding variables
   - Check variable names match exactly

3. **Database Connection Issues**:
   - Verify Supabase URL and key are correct
   - Check RLS policies are set up
   - Ensure tables exist

4. **Authentication Issues**:
   - Check Supabase auth settings
   - Verify redirect URLs in Supabase dashboard

### Getting Help:

- Check Vercel logs in the dashboard
- Check Supabase logs in the dashboard
- Review browser console for client-side errors

## Custom Domain (Optional)

1. **Add Domain in Vercel**:
   - Go to project settings
   - Click "Domains"
   - Add your custom domain

2. **Update Supabase Auth**:
   - Go to Supabase dashboard
   - Navigate to Authentication > URL Configuration
   - Add your custom domain to allowed URLs

## Performance Optimization

The build shows a warning about large chunks. To optimize:

1. **Code Splitting**:
   - Use dynamic imports for heavy components
   - Implement route-based code splitting

2. **Bundle Analysis**:
   ```bash
   npm install --save-dev rollup-plugin-visualizer
   ```

3. **Manual Chunks**:
   - Configure manual chunks in `vite.config.ts`

Your application is now ready for production! 🚀
