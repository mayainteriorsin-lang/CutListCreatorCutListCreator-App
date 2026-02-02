# Deployment Guide

This guide covers deployment procedures for CutListCreator.

## Automated Deployment (Recommended)

We use GitHub Actions for continuous deployment to Render.

1. **Trigger**: Push to `main` branch.
2. **Process**:
    - `CI` workflow runs tests and type checks.
    - `deploy.yml` triggers Render deployment if CI passes.
3. **Requirements**:
    - `RENDER_SERVICE_ID` and `RENDER_API_KEY` must be set in GitHub Repository Secrets.

## Manual Deployment (Render)

If automation fails, you can trigger a manual deploy:

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Select the service `cutlist-creator`.
3. Click **Manual Deploy** > **Deploy latest commit**.

## Manual Deployment (Hostinger VPS)

For legacy or alternative hoisting:

1. **Build**: `npm run build` locally.
2. **Transfer**: Copy `dist/` and `server/` to the VPS.
3. **Process Management**: Use `pm2` to manage the Node.js process.

    ```bash
    pm2 start dist/server/index.js --name "cutlist-app"
    ```

4. **Reverse Proxy**: Configure Nginx to proxy port 5000.

## Environment Variables

Ensure these are set in the production environment:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_SENTRY_DSN`
- `NODE_ENV=production`
