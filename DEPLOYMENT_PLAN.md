# Azure Deployment Plan - MFE Remote (bevalued.likewize.client)

## Executive Summary
This document outlines the deployment strategy for hosting the Angular Module Federation remote on Azure. This remote exposes `DatePicker` and `DataGrid` components for consumption by host applications.

---

## Architecture Overview

```
GitHub Repository (main branch)
  ↓ (Push triggers)
GitHub Actions Workflow
  ↓ (Builds & packages)
dist/browser/ (Angular build output)
  ├── index.html
  ├── remoteEntry.json (federation manifest)
  ├── DatePicker-[hash].js
  ├── DataGrid-[hash].js
  └── other assets...
  ↓ (Deploys to)
Azure Static Web Apps
  ↓ (Served via)
CDN (Global Edge Locations)
  ↓ (Consumed by)
Host Applications via Module Federation
```

---

## Deployment Options

### **Option 1: Azure Static Web Apps (CURRENT - RECOMMENDED) ✅**

**Best for:** Framework-agnostic static module federation
**Cost:** Free tier available (limited) / ~$9-15/mo for production
**Setup Time:** ~10 minutes

#### Prerequisites
- Azure subscription
- GitHub repository with main branch
- Azure Static Web Apps resource created

#### Step-by-Step Setup

1. **Create Azure Static Web Apps Resource**
   ```bash
   # Azure Portal → Create Resource → Static Web App
   # Select: GitHub as source
   # Select: This repository
   # Select: Branch: main
   # Select: Build Preset: Angular
   # App location: /
   # API location: (leave blank)
   # Output location: dist/browser
   ```

2. **Verify GitHub Secrets** (Auto-created during setup)
   ```
   AZURE_STATIC_WEB_APPS_API_TOKEN_GREEN_RIVER_0A94EF400
   ```

3. **Configure Caching**
   ```json
   // staticwebapp.config.json (ALREADY CONFIGURED)
   {
     "routes": [
       {
         "route": "/remoteEntry.json",
         "serve": "/remoteEntry.json",
         "headers": { "Content-Type": "application/json" }
       },
       {
         "route": "/*.js",
         "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
       }
     ]
   }
   ```

4. **Deploy**
   ```bash
   git push origin main
   # Workflow auto-triggers → Build → Deploy
   # Monitor: GitHub Actions tab
   ```

5. **Post-Deployment**
   - Get URL from Azure Portal (e.g., `https://bevalued-likewize-client.azurestaticapps.net`)
   - Verify remoteEntry.json is accessible
   - Test federation loading in host app

#### Monitoring & Maintenance
- **GitHub Actions:** Monitor build status
- **Azure Portal:** View deployment history, logs
- **Performance:** Azure Static Web Apps → Monitoring tab
- **Custom Domain:** Add via Azure Portal (optional)

---

### **Option 2: Azure App Service (Alternative)**

**Best for:** If you need Node.js backend API alongside
**Cost:** ~$15-50/mo (B1 tier and up)
**Setup Time:** ~20 minutes

#### When to Use
- You plan to add Node.js APIs
- You need server-side rendering (for demo index.html)
- More control over runtime

#### Quick Setup
```bash
# Create App Service with Node 20 runtime
# Deploy dist/browser via ZIP or GitHub Actions
# Use web.config for SPA routing (IIS)
```

---

### **Option 3: Azure Container Registry + Container Instances**

**Best for:** Complex deployments with CI/CD orchestration
**Cost:** ~$10-50/mo
**Setup Time:** ~45 minutes

Only consider if you have specific containerization needs.

---

## Current Configuration (Option 1 - Static Web Apps)

### Workflow File: `.github/workflows/azure-static-web-apps-green-river-0a94ef400.yml`

✅ **Status:** Configured and Ready

**What it does:**
```yaml
1. Trigger: Push to main branch
2. Setup: Node.js 20 + npm cache
3. Install: npm ci
4. Lint: npm run lint (optional)
5. Build: npm run build → outputs to dist/browser/
6. Verify: Check for index.html and remoteEntry.json
7. Deploy: Send to Azure Static Web Apps
```

### Build Output Structure
```
dist/browser/
├── index.html                  # SPA entry point
├── remoteEntry.json           # Federation manifest
├── importmap.json             # Import map for modules
├── favicon.ico
├── main-[HASH].js            # Main bundle
├── polyfills-[HASH].js       # Polyfills
├── styles-[HASH].css         # Styles
├── DatePicker-[HASH].js      # Exposed component
├── DataGrid-[HASH].js        # Exposed component
├── chunk-[HASH].js           # Shared chunks
└── 3rdpartylicenses.txt
```

### Routing Configuration: `staticwebapp.config.json`

✅ **Configured for:**
- Module federation remoteEntry.json serving
- SPA routing fallback
- Long-lived cache headers for hashed assets
- Proper MIME types

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code on main branch
- [ ] No uncommitted changes
- [ ] Tests passing locally: `npm run lint`
- [ ] Build succeeds locally: `npm run build`
- [ ] dist/browser/index.html exists
- [ ] dist/browser/remoteEntry.json exists

### Deployment
- [ ] Push to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Check Azure Portal deployment status
- [ ] Verify build output URL

### Post-Deployment
- [ ] Access deployed URL in browser
- [ ] Verify remoteEntry.json loads: `{url}/remoteEntry.json`
- [ ] Check Console for federation errors
- [ ] Test in host application
- [ ] Monitor Azure Portal for errors

---

## DNS & Custom Domain

### Add Custom Domain
1. **Azure Portal** → Static Web App → Custom domains
2. **Add:** `bevalued-likewize-client.com` (or your domain)
3. **Verify:** Add CNAME record to DNS provider
4. **Validate:** Azure auto-verifies

### Example DNS Record
```
Type: CNAME
Name: @
Value: bevalued-likewize-client.azurestaticapps.net
```

---

## CI/CD Pipeline Details

### Build Matrix (Possible Future Enhancement)
```yaml
matrix:
  node-version: [18, 20]
os: [ubuntu-latest, windows-latest]
```

### Environment Variables
Add to GitHub Settings if needed:
```
ENVIRONMENT: production
BUILD_MODE: production
```

---

## Performance Optimization

### Caching Strategy
```
Hashed Assets (*.js, *.css)
└─ Cache-Control: max-age=31536000 (1 year)

remoteEntry.json
└─ Cache-Control: must-revalidate (always fresh)

index.html
└─ Cache-Control: no-cache, must-revalidate
```

### CDN (Automatic with SWA)
- Global edge locations
- Automatic compression (gzip, brotli)
- DDoS protection included
- SSL/TLS termination

---

## Troubleshooting

### Build Fails
```bash
# 1. Check logs
cat build-output.txt

# 2. Verify Node version
node --version  # Should be 20.x

# 3. Verify output
ls -la dist/browser/index.html

# 4. Check remote entry
cat dist/browser/remoteEntry.json
```

### Deploy Fails
- **403 Forbidden:** Check API token in GitHub Secrets
- **404 on remoteEntry.json:** Verify staticwebapp.config.json routing
- **Blank page:** Check browser console for JavaScript errors

### Federation Loading Fails in Host
```javascript
// Host app console
// Check if remote is accessible
fetch('{url}/remoteEntry.json')
  .then(r => r.json())
  .then(r => console.log(r))
```

---

## Cost Analysis (Monthly)

| Component | Cost |
|-----------|------|
| Azure Static Web Apps (Free tier) | $0* |
| Azure Static Web Apps (Standard) | ~$9.50 |
| Custom Domain (optional) | ~$10-15 |
| **Total** | **$9.50-25** |

*Free tier limited to 1 GB bandwidth/month

---

## Scaling Considerations

### Current Setup Handles
- Unlimited deployments
- Automatic load balancing
- Global CDN distribution
- No server management

### Future Enhancements
1. **Blue-Green Deployments:** GitHub environments
2. **Staging Environment:** Separate Static Web App for testing
3. **Canary Deployments:** Progressive rollout via traffic splitting
4. **Monitoring:** Application Insights integration
5. **Automated Rollback:** On failed health checks

---

## Security

### Built-In Security
✅ HTTPS/TLS (Auto-managed)
✅ DDoS Protection (Standard)
✅ Web Application Firewall (Optional)
✅ Authentication (Optional - AAD/GitHub)

### Recommended: Add WAF
```bash
# Azure Portal → Static Web App → WAF → Enable
# Rule sets: OWASP 3.1 CRS
```

### API Security (When Adding APIs)
```javascript
// CORS Headers
Access-Control-Allow-Origin: https://host-domain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## Maintenance

### Monthly Tasks
- [ ] Review Azure billing
- [ ] Check GitHub Actions logs
- [ ] Monitor performance metrics
- [ ] Test federation in host apps

### Quarterly Tasks
- [ ] Security patch updates
- [ ] Dependency updates
- [ ] Performance optimization review
- [ ] Backup DNS records

---

## Documentation References

- [Azure Static Web Apps Docs](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions - Azure Static Web Apps](https://github.com/marketplace/actions/azure-static-web-apps-deploy)
- [Module Federation Docs](https://webpack.js.org/concepts/module-federation/)
- [Angular 20 Build Optimization](https://angular.io/guide/build)

---

## Next Steps

1. **Commit Changes**
   ```bash
   git add .
   git commit -m "Configure Azure Static Web Apps deployment"
   git push origin main
   ```

2. **Monitor First Deployment**
   - Go to GitHub Actions tab
   - Watch build & deploy process
   - Check Azure Portal for status

3. **Verify Deployment**
   - Visit deployment URL
   - Test remoteEntry.json
   - Validate in host application

4. **Setup Monitoring** (Optional)
   - Add Application Insights
   - Setup alerts for failed deployments
   - Monitor performance

---

**Document Version:** 1.0
**Last Updated:** 2026-07-21
**Status:** Ready for Deployment
