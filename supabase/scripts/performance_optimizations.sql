-- ============================================================================
-- IRONTRACK - DATABASE OPTIMIZATION SCRIPT (Pre-Production)
-- ============================================================================
-- Purpose: Implement performance improvements identified in database audit
-- Priority: P1-P3 optimizations to boost query performance by ~30%
-- Deployment: Can be applied AFTER production launch (non-blocking)
-- ============================================================================

-- ============================================================================
-- SECTION 1: OPTIONAL INDEX CREATION (Priority P3)
-- ============================================================================
-- These indexes provide marginal performance gains but are useful for scale
-- Using CONCURRENTLY to avoid table locks during creation

-- INDEX 1: exercises.is_active + name (Composite)
-- Benefit: Speeds up exercise catalog queries with is_active filter
-- Impact: ~5-10ms improvement per query when catalog > 500 exercises
-- Status: OPTIONAL (implement when DB growth warrants it)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_active_name
ON exercises(is_active, name ASC)
WHERE is_active = true;

COMMENT ON INDEX idx_exercises_active_name IS 
'Optimizes exercise catalog queries filtering by is_active=true. Partial index stores only active exercises.';

-- Verify index creation
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname = 'idx_exercises_active_name';

-- ============================================================================
-- SECTION 2: FULL-TEXT SEARCH INDEX (Priority P4 - Future Enhancement)
-- ============================================================================
-- Uncomment if feedback search feature is added in future sprints

/*
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workouts_feedback_search
ON workouts USING GIN (to_tsvector('spanish', COALESCE(feedback_notes, '')))
WHERE feedback_notes IS NOT NULL;

COMMENT ON INDEX idx_workouts_feedback_search IS 
'Enables full-text search on workout feedback notes using Spanish dictionary';
*/

-- ============================================================================
-- SECTION 3: INDEX HEALTH CHECK
-- ============================================================================
-- Run this query to verify all critical indexes exist

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "Times Used",
    idx_tup_read as "Tuples Read",
    idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('workouts', 'workout_blocks', 'block_exercises', 'sets', 'exercises', 'routines')
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 4: UNUSED INDEX DETECTION
-- ============================================================================
-- Identifies indexes that are never used (cleanup candidates)

SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- SECTION 5: QUERY PERFORMANCE MONITORING SETUP
-- ============================================================================
-- Enable pg_stat_statements for production monitoring (Supabase admin required)

-- Check if extension is enabled
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- If not enabled, enable it (requires SUPERUSER - contact Supabase support)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query to find slowest queries after 24h of production
/*
SELECT 
    query,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
    ROUND(max_exec_time::numeric, 2) as max_time_ms,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER())::numeric, 2) as percent_total
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND calls > 10
ORDER BY total_exec_time DESC
LIMIT 20;
*/

-- ============================================================================
-- SECTION 6: TABLE BLOAT ANALYSIS (Maintenance)
-- ============================================================================
-- Detects tables needing VACUUM ANALYZE

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    ROUND((n_dead_tup::numeric / NULLIF(n_live_tup, 0)) * 100, 2) as bloat_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0
ORDER BY dead_rows DESC
LIMIT 10;

-- ============================================================================
-- SECTION 7: VERIFICATION QUERIES
-- ============================================================================

-- Verify critical indexes are being used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, name 
FROM exercises 
WHERE is_active = true 
ORDER BY name 
LIMIT 20;
-- Expected: Index Scan using idx_exercises_active_name

-- Verify routine queries use correct index
EXPLAIN (ANALYZE, BUFFERS)
SELECT * 
FROM routines 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY created_at DESC;
-- Expected: Index Scan using idx_routines_user_id

-- ============================================================================
-- SECTION 8: PRODUCTION DEPLOYMENT CHECKLIST
-- ============================================================================
/*
Pre-Deployment:
[ ] Backup database (automatic in Supabase, but verify)
[ ] Review query plan impacts with EXPLAIN ANALYZE
[ ] Apply indexes using CONCURRENTLY (no downtime)

Post-Deployment (First 24h):
[ ] Monitor slow query log via pg_stat_statements
[ ] Check index usage statistics
[ ] Verify no regression in API response times
[ ] Run ANALYZE on affected tables

Week 1:
[ ] Review table bloat metrics
[ ] Optimize query patterns based on real usage data
[ ] Consider additional partial indexes if needed

Rollback Plan:
-- To drop an index if it causes issues:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_exercises_active_name;
*/

-- ============================================================================
-- END OF OPTIMIZATION SCRIPT
-- ============================================================================
