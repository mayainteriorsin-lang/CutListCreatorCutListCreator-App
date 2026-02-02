# Rollback Procedure

In case of a critical failure after deployment, follow these steps to rollback.

## Render (Primary)

1. **Login**: Access [Render Dashboard](https://dashboard.render.com).
2. **Select Service**: Go to `cutlist-creator`.
3. **History**: Click on the **Events** or **Deploys** tab.
4. **Select Stable**: Find the last known good deployment (green checkmark).
5. **Rollback**: Click the three dots (...) and select **Rollback to this deploy**.
6. **Verify**: Wait for build to finish and verify `/api/health` returns status `ok`.

## Database Rollback

If a database migration caused the issue:

1. We currently do not have automated down-migrations.
2. Restore from the latest backup available in the Render/Supabase dashboard.
3. Notify the team immediately.

## Quick Disable (Feature Flags)

If the issue is isolated to a new feature:

1. No deployment needed if you have admin access (future improvement).
2. For now, set the feature flag to `false` in `APP_CONFIG` or Environment variables and re-deploy.
