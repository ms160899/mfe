## ✅ Deployment Checklist - Quick Reference

### Pre-Deployment (Local)
- [ ] Run `npm install` to ensure all deps installed
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - completes successfully
- [ ] Verify `dist/browser/index.html` exists
- [ ] Verify `dist/browser/remoteEntry.json` exists
- [ ] Commit all changes to main branch
- [ ] Push to GitHub: `git push origin main`

### Azure Setup (One-time)
- [ ] Create Azure Static Web App resource
- [ ] Connect to GitHub repo (main branch)
- [ ] Build preset: **Angular**
- [ ] App location: **/**
- [ ] API location: **(leave blank)**
- [ ] Output location: **dist/browser**
- [ ] Note the API Token that appears in GitHub Secrets

### Deployment Verification
After push to main:
- [ ] GitHub Actions workflow runs (watch the workflow tab)
- [ ] Build step completes (should take ~2-3 minutes)
- [ ] Deploy step completes
- [ ] Visit deployment URL from Azure Portal
- [ ] Check URL: `https://{app-name}.azurestaticapps.net`
- [ ] Browser opens and doesn't show errors
- [ ] Open DevTools → Console (no red errors)
- [ ] Test remoteEntry.json: `https://{app-name}.azurestaticapps.net/remoteEntry.json`

### Post-Deployment (Host App Testing)
- [ ] Add remote to host app's federation config
- [ ] Host app can load `remoteEntry.json` without CORS errors
- [ ] Host app can import `DatePicker` component
- [ ] Host app can import `DataGrid` component
- [ ] Components render correctly in host app
- [ ] No console errors in host app

### Monitoring
- [ ] Setup email alerts for deployment failures
- [ ] Bookmark Azure Static Web Apps resource
- [ ] Add custom domain (if needed)
- [ ] Enable Application Insights (optional but recommended)

### Current Status
- ✅ GitHub Actions workflow configured
- ✅ staticwebapp.config.json configured
- ✅ angular.json builds to dist/browser/
- ✅ index.html exists in dist/browser/
- ✅ remoteEntry.json generated automatically
- ⏳ **Waiting for:** Azure Static Web App resource creation + first deployment

### What to Do Next (Recommended Order)

**Step 1:** Create Azure Static Web Apps Resource
```
Azure Portal → Create Resource → Static Web App
```

**Step 2:** Connect to GitHub
```
Select your GitHub repo (mfe-repo)
Select branch: main
Select: Angular as build preset
Fill in:
  - App location: /
  - API location: (blank)
  - Output location: dist/browser
Click "Create"
```

**Step 3:** Get the API Token
```
Azure Portal → Your Static Web App → 
Settings → Manage deployment token
Copy token to GitHub Secrets (should auto-populate)
```

**Step 4:** Push Code
```
git add .
git commit -m "Configure for Azure Static Web Apps"
git push origin main
```

**Step 5:** Monitor Deployment
```
GitHub → Actions tab → Watch workflow execution
Azure Portal → Deployment history
```

**Step 6:** Test
```
Visit the generated URL in browser
Test remoteEntry.json endpoint
Load host application and verify federation works
```

### Troubleshooting Quick Ref

**Build fails in GitHub Actions:**
1. Check Node version: should be 20
2. Check npm install succeeded
3. View full build logs in GitHub Actions

**Deployment says "File not found":**
1. Verify output_location is `dist/browser` (not `dist`)
2. Run `npm run build` locally and verify `dist/browser/index.html` exists

**remoteEntry.json returns 404:**
1. Check staticwebapp.config.json routes
2. Verify file exists in dist/browser/
3. Clear browser cache and try again

**Host app can't load remote:**
1. Check host app federation config has correct URL
2. Verify CORS is not blocking (SWA should allow all origins)
3. Check DevTools → Network tab for remoteEntry.json request
4. Look for federation error messages in console

### Deployment URLs

- **Static Web App:** `https://{app-name}.azurestaticapps.net`
- **Remote Entry:** `https://{app-name}.azurestaticapps.net/remoteEntry.json`
- **Azure Portal:** `https://portal.azure.com`
- **GitHub Actions:** `https://github.com/{org}/{repo}/actions`

---

**Remember:** This setup uses zero-configuration deployment. Just push to main and Azure handles the rest!
