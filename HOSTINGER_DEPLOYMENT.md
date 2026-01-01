# Hostinger Deployment Guide for CutList Creator

## Pre-Deployment Checklist ✅

Your application is **READY FOR DEPLOYMENT**. Here's what's configured:

- ✅ Build system configured (`npm run build`)
- ✅ Production server ready (`npm start`)
- ✅ PostgreSQL database configured
- ✅ Environment variables set up
- ✅ Static file serving configured
- ✅ Production build tested locally

---

## Step 1: Prepare Your Hostinger Environment

### A. Choose Hosting Plan
- **Recommended**: VPS Hosting or Cloud Hosting (not shared hosting)
- Node.js applications require VPS/Cloud for full control
- Minimum specs: 1GB RAM, Node.js 18+ support

### B. Access Your Hostinger VPS
1. Log in to Hostinger control panel
2. Access your VPS via SSH:
   ```bash
   ssh root@your-server-ip
   ```

---

## Step 2: Set Up PostgreSQL Database

### Option A: Use Hostinger's PostgreSQL (if available)
1. Go to Hostinger control panel → Databases
2. Create new PostgreSQL database
3. Note down:
   - Database name
   - Username
   - Password
   - Host
   - Port

### Option B: Use External Database (Current Setup)
Your app is already configured to use Render PostgreSQL:
```
postgresql://cutlist_db_user:L3LgJBOU3hACHrmqv3bGAae0grM3Bfd4@dpg-d4o580er433s73en4vkg-a.oregon-postgres.render.com/cutlist_db?sslmode=require
```

**This will work fine!** You can keep using this database.

---

## Step 3: Upload Your Application

### Method 1: Git (Recommended)

1. **On your VPS, install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version  # Should show v20.x or higher
   ```

2. **Install Git:**
   ```bash
   sudo apt-get update
   sudo apt-get install git
   ```

3. **Clone your repository:**
   ```bash
   cd /var/www
   git clone https://github.com/yourusername/CutListCreator.git
   cd CutListCreator
   ```

### Method 2: FTP Upload

1. Compress your project folder (excluding node_modules)
2. Upload via Hostinger File Manager or FTP client
3. Extract on server:
   ```bash
   cd /var/www
   unzip CutListCreator.zip
   cd CutListCreator
   ```

---

## Step 4: Configure Environment Variables

1. **Create .env file on server:**
   ```bash
   nano .env
   ```

2. **Add these variables:**
   ```env
   DATABASE_URL=postgresql://cutlist_db_user:L3LgJBOU3hACHrmqv3bGAae0grM3Bfd4@dpg-d4o580er433s73en4vkg-a.oregon-postgres.render.com/cutlist_db?sslmode=require
   PORT=5000
   NODE_ENV=production
   ```

3. **Save and exit** (Ctrl+X, then Y, then Enter)

---

## Step 5: Install Dependencies and Build

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Build the application
npm run build
```

This will create:
- `/dist/public/` - Frontend static files
- `/dist/index.js` - Backend server

---

## Step 6: Set Up Process Manager (PM2)

PM2 keeps your Node.js app running 24/7 and auto-restarts on crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your application
pm2 start npm --name "cutlist-app" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to auto-start on server reboot
pm2 startup
# Follow the command it prints

# Check status
pm2 status
pm2 logs cutlist-app
```

**Useful PM2 commands:**
```bash
pm2 restart cutlist-app    # Restart app
pm2 stop cutlist-app        # Stop app
pm2 logs cutlist-app        # View logs
pm2 monit                   # Monitor CPU/Memory
```

---

## Step 7: Configure Nginx Reverse Proxy

Nginx forwards traffic from port 80/443 to your Node.js app on port 5000.

1. **Install Nginx:**
   ```bash
   sudo apt-get install nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/cutlist
   ```

3. **Add this configuration:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/cutlist /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl restart nginx
   ```

---

## Step 8: Set Up SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts - it will auto-configure HTTPS
```

Certbot will automatically renew certificates.

---

## Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Step 10: Domain Configuration

1. Go to your domain registrar (e.g., Namecheap, GoDaddy)
2. Point your domain to Hostinger VPS IP:
   - **A Record**: `@` → `your-vps-ip`
   - **A Record**: `www` → `your-vps-ip`
3. Wait 10-30 minutes for DNS propagation

---

## Post-Deployment Verification

### Test Your Deployment

1. **Check if app is running:**
   ```bash
   pm2 status
   curl http://localhost:5000/test
   ```

2. **Visit your domain:**
   - http://yourdomain.com
   - Should see your CutList Creator application

3. **Test database connection:**
   - Try creating a cabinet
   - Check master settings
   - Verify data persists

---

## Maintenance Commands

### Update Application
```bash
cd /var/www/CutListCreator
git pull                    # Get latest code
npm install                 # Update dependencies
npm run build              # Rebuild
pm2 restart cutlist-app    # Restart server
```

### View Logs
```bash
pm2 logs cutlist-app       # App logs
sudo tail -f /var/log/nginx/access.log    # Nginx access logs
sudo tail -f /var/log/nginx/error.log     # Nginx error logs
```

### Database Backup
```bash
# On your local machine
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Monitor Resources
```bash
pm2 monit                  # Real-time monitoring
htop                       # System resources
df -h                      # Disk space
free -m                    # Memory usage
```

---

## Troubleshooting

### App won't start
```bash
pm2 logs cutlist-app       # Check error logs
node dist/index.js         # Test manually
```

### Database connection issues
```bash
# Test DATABASE_URL
echo $DATABASE_URL
# Verify in .env file
cat .env
```

### Port already in use
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill process
sudo kill -9 <PID>
```

### Nginx issues
```bash
sudo nginx -t              # Test config
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Alternative: Hostinger's Node.js Hosting

If Hostinger offers managed Node.js hosting:

1. Go to Hostinger control panel → Node.js Apps
2. Create new Node.js application
3. Upload your code
4. Set environment variables in control panel
5. Configure start command: `npm start`
6. Build command: `npm run build`

---

## Security Checklist

- ✅ Use strong database passwords
- ✅ Enable firewall (UFW)
- ✅ Set up SSL/HTTPS
- ✅ Keep Node.js and dependencies updated
- ✅ Use environment variables (never commit .env)
- ✅ Regular database backups
- ✅ Monitor PM2 logs for errors

---

## Performance Optimization

1. **Enable Gzip in Nginx:**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Set up caching headers** for static assets

3. **Monitor database performance:**
   - Add indexes if queries are slow
   - Use `EXPLAIN ANALYZE` for slow queries

4. **Scale up VPS** if needed (more CPU/RAM)

---

## Support

- **Hostinger Support**: https://www.hostinger.com/support
- **PM2 Docs**: https://pm2.keymetrics.io/docs
- **Nginx Docs**: https://nginx.org/en/docs

---

**Your app is production-ready! 🚀**

All builds pass, database is configured, and the server starts successfully on port 5000.
