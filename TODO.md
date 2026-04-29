# Configuración y Encendido Local (Windows)

## ⚠️ MIGRACIONES PENDIENTES (LISTA MAESTRA - PRODUCCIÓN)

Estas migraciones deben ejecutarse en orden estricto para asegurar la estabilidad del sistema, la integridad de los datos de entrenamiento y el cumplimiento de la auditoría de seguridad.

### Fase 1: Corrección de Tipos y Estructura Base (Legacy)
1. `supabase/migrations/20260211150000_fix_coalesce_type_mismatch.sql`
2. `supabase/migrations/20260225100000_fix_user_role_type_cast.sql`
3. `supabase/migrations/20260225120000_create_exercises_table.sql`
4. `supabase/migrations/20260225120001_add_translations.sql`
5. `supabase/migrations/20260225120002_fix_exercise_id_types.sql`
6. `supabase/migrations/20260225120003_robust_search.sql`

### Fase 2: Estabilización del Catálogo (Sprint v3.12)
7. `supabase/migrations/20260427120000_stabilize_exercises.sql`
8. `supabase/migrations/20260427130000_translate_exercise_data.sql`
9. `supabase/migrations/20260427140000_production_fixes.sql`
10. `supabase/migrations/20260427150000_soft_delete.sql`
11. `supabase/migrations/20260427151000_update_search_rpc.sql`
12. `supabase/migrations/20260427170000_fix_save_workout_types.sql`

### Fase 3: Seguridad, Password Reset e Infraestructura
13. `supabase/migrations/20260428125600_auditoria_seguridad_rendimiento.sql`
14. `supabase/migrations/20260428131000_force_password_reset.sql`
15. `supabase/migrations/20260428133500_sanitize_legacy_profiles.sql`
16. `supabase/migrations/20260428140000_maintenance_mode.sql`

### Fase 4: Parches Críticos (Visibilidad y Auditoría)
17. `supabase/migrations/20260429100000_fix_client_routine_details_rls.sql` (Visibilidad de ejercicios cliente)
18. `supabase/migrations/20260429100001_fix_auditoria_seguridad.sql` (Protección de roles y RLS estricto)
19. `supabase/migrations/20260429100002_restore_workout_metadata.sql` (Restaura target_rest_time y fix calistenia)
20. `supabase/migrations/20260429100003_secure_maintenance_control.sql` (RPC seguro para toggle de mantenimiento)

---

## Comandos de Inicio

1. **Arrancar Docker en Windows**
   ```powershell
   & "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

2. **Arrancar Supabase**
   ```powershell
   npx supabase start
   ```

3. **Resetear DB con todas las migraciones**
   ```powershell
   npx supabase db reset
   ```

4. **Arrancar Aplicación**
   ```powershell
   npm run dev
   ```

---

# Tareas: Sprint v5.3 (Maintenance & Data Integrity) [✓] Completado

- [x] **Seguridad de Mantenimiento**:
    - [x] Migrar toggle de mantenimiento a RPC seguro (`update_maintenance_settings`).
    - [x] Proteger tabla `app_settings` para que solo sea editable vía RPC/service_role.
- [x] **Integridad de Datos (Workout Summary)**:
    - [x] Restaurar campo `target_rest_time` en persistencia atómica.
    - [x] Corregir filtro de peso en `ExerciseSummaryCard` (incluir peso 0 para calistenia).
- [x] **Playwright E2E Stabilization**:
    - [x] Refactorizar `maintenance-mode.spec.js` con `data-testid` y aserciones de UI robustas.
    - [x] Lograr 100% PASSING en flujo de mantenimiento (Local).
    - [x] Importar catálogo de ejercicios traducido para estabilizar tests de guardado atómico.
    - [x] Corregir crash en `ExerciseSummaryCard` al renderizar ejercicios personalizados (ad-hoc).
    - [x] Estabilizar `real-world.spec.js` (Flujo completo de cliente con ejercicio ad-hoc).

# Tareas: Sprint v5.2 (Performance & Logic Hardening) [✓] Completado

- [x] **Performance Optimization**:
    - [x] Crear índices compuestos en `sets` para búsqueda de PR.
    - [x] Indexar `block_exercises(exercise_id)` y `workouts(user_id, date)`.
- [x] **Logic & UI Fixes**:
    - [x] **Weight is King**: Priorizar Peso sobre Reps en PRs.
    - [x] **Modales**: Implementar React Portal en `WorkoutDetail` para evitar problemas de z-index.

# Tareas: Sprint v5.0 (Usability & Maintenance) [✓] Completado

- [x] **Calendar Month Navigation**: Habilitar navegación entre meses.
- [x] **Fix Stability & Auth Bugs**:
    - [x] Manejar error `JWT issued at future` en `useUserRole.js`.
    - [x] Corregir advertencias de `input value null` en `WorkoutBlock.jsx`.

---

# 📌 Backlog & V2 Offline

- [ ] **Offline UX Improvement (Historial)**: Mostrar entrenamientos pendientes de subida en la lista de Historial.
- [ ] **Offline V2 (Full Scope)**: Soporte offline completo para acciones de escritura (rutinas, perfil).
- [ ] **Entrenador - Historial de Asignaciones**: Vista dedicada para ver historial de rutinas enviadas.
- [ ] **Cliente - Rutinas Favoritas**: Sistema para marcar/desmarcar plantillas favoritas.
