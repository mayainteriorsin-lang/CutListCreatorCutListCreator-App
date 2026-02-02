-- Migration: Add Authentication and Multi-Tenancy
-- Phase 1: SaaS Transformation
-- Date: 2026-02-02

-- ============================================================================
-- 1. CREATE TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================================
-- 2. CREATE USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ============================================================================
-- 3. CREATE ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 4. CREATE AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- ============================================================================
-- 5. CREATE REFRESH TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================================
-- 6. INSERT DEFAULT ROLES
-- ============================================================================
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access', '["*"]'),
  ('manager', 'Manage team and quotations', '["quotations.*", "users.read", "reports.*"]'),
  ('user', 'Create and manage own quotations', '["quotations.create", "quotations.read", "quotations.update"]'),
  ('viewer', 'Read-only access', '["quotations.read", "reports.read"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. CREATE DEFAULT TENANT FOR EXISTING DATA
-- ============================================================================
INSERT INTO tenants (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Data', 'legacy', 'enterprise', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. ADD TENANT_ID TO EXISTING TABLES (if they exist)
-- ============================================================================

-- Add tenant_id to quotations table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quotations') THEN
    ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
    
    -- Assign existing quotations to default tenant
    UPDATE quotations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Add tenant_id to rate_cards table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rate_cards') THEN
    ALTER TABLE rate_cards ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON rate_cards(tenant_id);
    
    -- Assign existing rate cards to default tenant
    UPDATE rate_cards SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Add tenant_id to custom_folders table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'custom_folders') THEN
    ALTER TABLE custom_folders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_custom_folders_tenant ON custom_folders(tenant_id);
    
    -- Assign existing folders to default tenant
    UPDATE custom_folders SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Add tenant_id to leads table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
    CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
    
    -- Assign existing leads to default tenant
    UPDATE leads SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END $$;

-- ============================================================================
-- 9. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
