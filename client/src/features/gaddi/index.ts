/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED CODE - DO NOT MODIFY
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * GADDI Feature Module
 * 
 * CRITICAL PRODUCTION CODE - Fixed after extensive debugging (Nov 23, 2025)
 * 
 * Provides panel marking functionality for GADDI (edge banding groove) processing.
 * 
 * MANUFACTURING RULE (2025-11-23):
 * - TOP/BOTTOM panels: GADDI marks WIDTH dimension
 * - LEFT/RIGHT panels: GADDI marks HEIGHT dimension
 * - Panel rotation on sheet does NOT change which dimension is marked
 * 
 * ⚠️ WARNING: This module is used by both preview and PDF export.
 *    Any modifications may break GADDI panel marking system.
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

export * from './types';
export * from './axis-mapping';
