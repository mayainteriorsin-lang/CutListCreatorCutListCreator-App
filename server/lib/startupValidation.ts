/**
 * PHASE 8: Startup Configuration Validation
 *
 * Fail-fast validation of critical environment/config at boot time.
 * Blocks unsafe defaults in production mode.
 */

export interface StartupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate critical configuration at startup
 * Throws in production if critical config is missing/unsafe
 */
export function validateStartupConfig(): StartupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET is required in production');
    } else {
      warnings.push('JWT_SECRET not set - using dev fallback (unsafe for production)');
    }
  } else if (jwtSecret.length < 32) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET must be at least 32 characters in production');
    } else {
      warnings.push('JWT_SECRET is weak (< 32 chars) - acceptable only in dev');
    }
  } else if (jwtSecret.includes('change-in-production') || jwtSecret.includes('dev-secret')) {
    if (isProduction) {
      errors.push('FATAL: JWT_SECRET contains unsafe default value in production');
    }
  }

  // 2. DATABASE_URL validation
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    if (isProduction) {
      errors.push('FATAL: DATABASE_URL is required in production');
    } else {
      warnings.push('DATABASE_URL not set - some features may not work');
    }
  }

  // 3. Dev auth bypass check
  if (isProduction) {
    if (process.env.VITE_BYPASS_AUTH === 'true') {
      errors.push('FATAL: VITE_BYPASS_AUTH=true is not allowed in production');
    }
    if (process.env.BYPASS_AUTH === 'true') {
      errors.push('FATAL: BYPASS_AUTH=true is not allowed in production');
    }
  }

  // 4. Port validation
  const port = process.env.PORT;
  if (port && (isNaN(parseInt(port, 10)) || parseInt(port, 10) < 1 || parseInt(port, 10) > 65535)) {
    errors.push(`FATAL: Invalid PORT value: ${port}`);
  }

  // 5. Production warnings for optional but recommended settings
  if (isProduction) {
    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL not set - using in-memory cache (not recommended for production)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run startup validation and handle results
 * - In production: exits process on critical errors
 * - In development: logs warnings but continues
 */
export function runStartupValidation(): void {
  const result = validateStartupConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  // Log warnings
  result.warnings.forEach(w => {
    console.warn(`[STARTUP WARNING] ${w}`);
  });

  // Handle errors
  if (!result.valid) {
    result.errors.forEach(e => {
      console.error(`[STARTUP ERROR] ${e}`);
    });

    if (isProduction) {
      console.error('[STARTUP] Aborting due to critical configuration errors');
      process.exit(1);
    } else {
      console.warn('[STARTUP] Continuing despite errors (development mode only)');
    }
  } else {
    console.log('[STARTUP] Configuration validation passed');
  }
}
