# 🚀 CutListCreator Deployment Guide

Complete guide for deploying your Kitchen Cabinet Cutting List Generator to production.

---

## 📋 **Deployment Options**

### **Option 1: Vercel (Recommended) ⭐**
**Best for:** Full-stack apps with serverless functions
**Pros:** 
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy GitHub integration
- ✅ Automatic deployments on push
- ✅ Serverless functions for API

**Cost:** Free for hobby projects

---

### **Option 2: Railway**
**Best for:** Apps needing dedicated database
**Pros:**
- ✅ Includes PostgreSQL database
- ✅ Easy deployment
- ✅ Good for monolithic apps
- ✅ $5/month free credit

**Cost:** ~$5-10/month after free credit

---

### **Option 3: Render**
**Best for:** Free full-stack hosting
**Pros:**
- ✅ Free tier available
- ✅ PostgreSQL included
- ✅ Auto-deploy from Git

**Cost:** Free tier available

---

## 🎯 **Deploying to Vercel (Recommended)**

### **Prerequisites:**
- ✅ GitHub repository (already done!)
- ✅ Vercel account (free)
- ✅ Database credentials (Supabase - already configured)

---

### **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**

```bash
vercel login
```

This will open a browser for authentication.

---

### **Step 3: Environment Variables**

Create a `.env.production` file (locally only, don't commit):

```env
DATABASE_URL=your_database_url_here
NODE_ENV=production
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
```

---

### **Step 4: Deploy**

From your project root:

```bash
# First deployment (interactive)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? CutListCreator
# - Directory? ./ (root)
# - Override settings? No

# Production deployment
vercel --prod
```

---

### **Step 5: Add Environment Variables in Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select your project "CutListCreator"
3. Go to **Settings → Environment Variables**
4. Add these variables:
   - `DATABASE_URL` = Your Supabase PostgreSQL URL
   - `NODE_ENV` = `production`
   - `GOOGLE_CLOUD_PROJECT_ID` = Your Google Cloud project ID (if using)
   - `GOOGLE_CLOUD_STORAGE_BUCKET` = Your bucket name (if using)

5. Click **Save**
6. Go to **Deployments** tab
7. Click **Redeploy** on the latest deployment

---

## 🎯 **Alternative: Deploy via Vercel Website**

### **Step 1: Visit Vercel**
Go to https://vercel.com

### **Step 2: Import Repository**
1. Click **Add New → Project**
2. Import from Git: `https://github.com/mayainteriorsin-lang/CutListCreator`
3. Click **Import**

### **Step 3: Configure Project**
- **Framework Preset:** Other
- **Build Command:** `npm run build`
- **Output Directory:** `dist/client`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

### **Step 4: Add Environment Variables**
Click **Environment Variables** section and add:
- `DATABASE_URL`
- `NODE_ENV` = `production`
- (Add other secrets as needed)

### **Step 5: Deploy**
Click **Deploy**

Wait 2-3 minutes for build to complete.

---

## 🚀 **Deploying to Railway**

### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

### **Step 2: Login**
```bash
railway login
```

### **Step 3: Initialize Project**
```bash
railway init
```

### **Step 4: Add PostgreSQL**
```bash
railway add -p postgres
```

### **Step 5: Set Environment Variables**
```bash
railway variables set NODE_ENV=production
```

### **Step 6: Deploy**
```bash
railway up
```

---

## 🚀 **Deploying to Render**

### **Step 1: Create Account**
Visit https://render.com and sign up

### **Step 2: New Web Service**
1. Click **New → Web Service**
2. Connect your GitHub repository
3. Select `CutListCreator`

### **Step 3: Configure**
- **Name:** CutListCreator
- **Environment:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** Free

### **Step 4: Add PostgreSQL**
1. Go to Dashboard → New → PostgreSQL
2. Copy the internal database URL
3. Add to Web Service environment variables

### **Step 5: Environment Variables**
Add in Render dashboard:
- `DATABASE_URL` = Your PostgreSQL URL
- `NODE_ENV` = production

### **Step 6: Deploy**
Click **Create Web Service**

---

## 🔧 **Post-Deployment Configuration**

### **1. Update CORS Settings**
In `server/index.ts`, add your production URL:

```typescript
app.use(cors({
  origin: ['https://your-app.vercel.app'],
  credentials: true
}));
```

### **2. Database Migrations**
Run migrations on production:

```bash
# Via Vercel CLI
vercel env pull
npm run db:push

# Or manually in production
# Connect to your production database and run migrations
```

### **3. Test Deployment**
Visit your deployed URL and test:
- ✅ Homepage loads
- ✅ Add cabinet functionality
- ✅ PDF generation
- ✅ Database persistence

---

## 📊 **Monitoring & Maintenance**

### **Vercel Dashboard**
- View deployment logs
- Monitor function invocations
- Check error rates
- View bandwidth usage

### **Database Monitoring**
- Supabase dashboard
- Connection pool status
- Query performance

### **Performance**
- Core Web Vitals
- Load times
- API response times

---

## 🐛 **Troubleshooting**

### **Build Fails**
- Check build logs in deployment dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compiles locally: `npm run check`

### **Environment Variables Not Working**
- Verify variable names match exactly
- Redeploy after adding variables
- Check for typos in variable values

### **Database Connection Issues**
- Verify DATABASE_URL is correct
- Check if database allows external connections
- Verify SSL/TLS settings

### **API Routes 404**
- Check `vercel.json` rewrites configuration
- Verify API routes are in `/api` directory
- Check function logs for errors

---

## 🔒 **Security Checklist**

Before going live:
- ✅ All secrets in environment variables (not code)
- ✅ `.env` file in `.gitignore`
- ✅ HTTPS enabled (automatic on Vercel)
- ✅ CORS properly configured
- ✅ Database credentials secure
- ✅ Input validation on all forms
- ✅ SQL injection protection (Drizzle ORM handles this)

---

## 📈 **Scaling Considerations**

### **Free Tier Limits (Vercel)**
- 100 GB bandwidth/month
- 100 GB-hours function execution
- 6,000 minutes build time

### **When to Upgrade**
- High traffic (>10,000 visitors/month)
- Need dedicated database
- Require custom domains
- Need team collaboration features

---

## 🎉 **Next Steps After Deployment**

1. ✅ **Custom Domain**
   - Buy domain (Namecheap, Google Domains)
   - Configure in Vercel dashboard
   - Add DNS records

2. ✅ **SSL Certificate**
   - Automatic on Vercel
   - Verify HTTPS is working

3. ✅ **Monitoring**
   - Set up error tracking (Sentry)
   - Add analytics (Google Analytics)
   - Monitor uptime (UptimeRobot)

4. ✅ **CI/CD**
   - Automatic deployments on push to `main`
   - Preview deployments for pull requests
   - Run tests before deployment

5. ✅ **Backup Strategy**
   - Regular database backups
   - Export PDF storage backups
   - Code versioning (Git)

---

## 📞 **Support Resources**

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs

---

## 🚀 **Ready to Deploy?**

Follow the steps above for your chosen platform, and your CutListCreator will be live on the internet!

**Good luck with your deployment!** 🎊
