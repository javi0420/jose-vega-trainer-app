# Deprecated E2E Tests

## Overview
These tests have been deprecated as of **2026-01-09** due to architectural changes in the routine assignment system.

## Why Deprecated?

### Old Architecture (these tests)
- Trainers assigned routines by **creating a copy** of their template for the client
- Copied routine appeared in client's `/app/routines` list
- Client owned a separate instance of the routine

### New Architecture (Sprint v3.5)
- Trainers assign routines via **reference** using `assigned_routines` table
- No duplication - routine remains trainer's property
- Client sees assignments in `/app/assigned-routines` page
- Supports trainer notes, viewed tracking, and better data integrity

## Replacement Test
**`e2e/assigned-routines.spec.js`** covers all functionality:
1. Trainer assignment flow with notes
2. Client viewing assigned routines  
3. Client starting workouts from assignments
4. Badge tracking for new assignments

## Deprecated Files
1. `_deprecated_trainer-assign-routine.spec.js.bak` - Full cycle test (create template → assign → client sees)
2. `_deprecated_load-template.spec.js.bak` - Template loading and assignment flow

These files are kept for reference but **will not run** in test suites.
