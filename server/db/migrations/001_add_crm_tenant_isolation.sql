-- PHASE 2: Tenant Isolation Migration for CRM tables
-- This migration is IDEMPOTENT - safe to run multiple times

-- Step 1: Add tenant_id column to leads if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$;

-- Step 2: Add tenant_id column to activities if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'activities' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE activities ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$;

-- Step 3: Add tenant_id column to quotes if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE quotes ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$;

-- Step 4: Drop old global unique constraint on mobile (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leads_mobile_unique' AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads DROP CONSTRAINT leads_mobile_unique;
    END IF;
END $$;

-- Step 5: Add composite unique constraint (tenant_id, mobile) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leads_tenant_mobile_unique' AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT leads_tenant_mobile_unique UNIQUE (tenant_id, mobile);
    END IF;
END $$;

-- Step 6: Add indexes for tenant_id columns (for query performance)
CREATE INDEX IF NOT EXISTS leads_tenant_id_idx ON leads (tenant_id);
CREATE INDEX IF NOT EXISTS activities_tenant_id_idx ON activities (tenant_id);
CREATE INDEX IF NOT EXISTS quotes_tenant_id_idx ON quotes (tenant_id);

-- Step 7: Backfill existing rows with 'default' tenant (already handled by DEFAULT clause)
-- No additional action needed - the DEFAULT 'default' ensures existing rows get the value

-- Verification query (run manually to check):
-- SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM leads;
-- SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM activities;
-- SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant FROM quotes;
