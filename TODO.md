# Configuración y Encendido Local (Windows)

## ⚠️ MIGRACIONES PENDIENTES (LISTA COMPLETA & CRÍTICA)

Estas migraciones incluyen cambios recientes para el sistema de Feedback y refinamiento de músculos. **Ejecutar en orden estricto:**

### Grupo 1: Estructura & Datos
1.  **`20260122000000_split_brazos_muscle_group.sql`**
    *   *Propósito:* División inicial de Brazos en Bíceps/Tríceps.
2.  **`20260126000000_save_workout_as_routine.sql`**
    *   *Propósito:* Funcionalidad para guardar entreno como plantilla.

### Grupo 2: Refinamientos (Sprint v4.2 - v4.5)
3.  **`20260126100000_muscle_group_refinement.sql`**
    *   *Propósito:* Refinamiento extra (ej: Abducción de cadera -> Piernas) y limpieza de "Brazos".
4.  **`20260126200000_feedback_notifications.sql`**
    *   *Propósito:* **Crítico.** Añade columnas para feedback (`client_feedback`, `trainer_feedback_viewed_at`).
5.  **`20260126210000_update_activity_rpc.sql`**
    *   *Propósito:* Optimización del dashboard de actividad.
6.  **`20260126220000_fix_assigned_routines_insert.sql`**
    *   *Propósito:* Corrección en RPC de asignación.
7.  **`20260126230000_trainer_visibility_fixes.sql`**
    *   *Propósito:* Políticas de seguridad para que el entrenador vea el feedback.
8.  **`20260127103000_add_mark_feedback_as_viewed_rpc.sql`**
    *   *Propósito:* **Crítico.** RPC necesario para que el cliente marque el feedback como leído (usado en tests E2E).
9.  **`20260128174500_fix_client_delete_workout_rls.sql`**
    *   *Propósito:* **Crítico.** Corrige políticas de RLS para permitir borrado de entrenamientos por parte de clientes.

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

3. **Arrancar Aplicación**
   ```powershell
   npm run dev
   ```

---

# Tareas: Sprint v4.5 (Stability & Test Fixes) [✓] Completado

- [x] **Fix Critical E2E Tests**:
    - [x] `feedback-flow.spec.js`: Corregido "hang" por falta de input `reps` y selectores inestables.
    - [x] `workout-feedback.spec.js`: Corregido error idéntico en el flujo de feedback.
    - [x] **Estabilización Global**: Uso de `data-testid="workout-btn-complete-set"` en lugar de `has-text`.
    - [x] **Limpieza de Procesos**: Script/Protocolo para matar procesos `node.exe` colgados (>3h).
- [x] **Documentación**:
    - [x] Actualización de `TODO.md` con lista consolidada de 8 migraciones.
    - [x] Limpieza de reportes de error antiguos.

# Tareas: Sprint v4.4 (Stability & Playwright Fixes) [✓] Completado
- [x] **Estabilización de Tests E2E**:
    - [x] Lograr 100% PASSING en toda la suite (7/7 tests críticos).
    - [x] Corregir locatarios brittle y añadir sincronización `waitForURL`.
    - [x] Exponer `window.supabase` para permitir limpieza de DB desde tests.
- [x] **Robustez del Código**:
    - [x] Corregir **Race Condition** en `RoutineDetail.jsx` (ignore flag in useEffect).
    - [x] Refactorizar previsualización en `AssignRoutineModal.jsx` a `useQuery` para evitar estados de carga inconsistentes.

# Tareas: Sprint v4.2 (Background Timers & Branding) [✓] Completado
- [x] **Fix Timer de Duración del Entreno**:
    - [x] Implementar solución usando `Page Visibility API`.
- [x] **Dividir Músculo "Brazos"**:
    - [x] Actualizar catálogo y migración DB.
- [x] **Rebranding & URL**:
    - [x] Cambio a `joaquinSilvaTrainer`.

# Tareas: Sprint v4.1 (Performance & Scalability) [✓] Completado
- [x] **Fix Feed de Actividad**: RPCs optimizados para evitar errores HTTP 414.

# Tareas: Sprint v4.0 (Atomic Save & Data Reliability) [✓] Completado
- [x] **Guardado Atómico**: RPC `save_full_workout`.

# Tareas: Sprint v3.12 (Global Timer & Stability) [✓] Completado
- [x] **Global Rest Timer**: Contexto persistente y Overlay.

# Tareas: Sprint v3.11 (Precision & Flexibility) [✓] Completado
- [x] **Soporte de Pesos Decimales**.
- [x] **Reordenamiento (Drag & Drop)**.
- [x] **Comentarios por Ejercicio**.

# Tareas: Sprint v3.8 (Client Management & Security) [✓] Completado
- [x] **Desactivación de Usuarios**.

# Tareas: Sprint v3.7 (GDPR Privacy Consent System) [✓] Completado
- [x] **Sistema de Consentimiento GDPR** (Modal bloqueante y registro en DB).

# Tareas: Sprint v3.5 (Routine System Enhancements) [✓] Completado
- [x] **Client Assigned Routines View**.
- [x] **Trainer Assignment Notes**.

# Tareas: Feedback Sesión (Visual & UX Fixes)
- [x] **Nuevo Entreno**: Añadir botón para "Cargar Plantilla".
- [x] **Gestor de Rutinas**: Comprobar funcionamiento en Desktop y Mobile.
- [x] **UI Entrenador**: Cambiar texto botón rutinas a "Plantillas".
- [x] **Navegación**: Cambiar diseño de los iconos de la barra de navegación (Bottom Nav).
- [x] **UI/UX & Feedback**:
    - [x] Añadir resúmenes para borrar.
    - [x] **NOTIFICACIÓN EN ENTRENAMIENTO**: Mostrar notificación visual.
    - [x] Cambiar grupo muscular general a "Piernas" en filtros restantes.
- [x] **Dashboard & Calendario**:
    - [x] Refactor Calendario: Consistencia semanal.

# Tareas: Future Optimizations
- [x] **Enhanced Scroll**: Aumentar área de scroll al final de listas.

# Tareas: Sprint v4.6 (Session Insights) [✓] Completado

- [x] **Cliente - Notas de Sesión Anterior**: Mostrar automáticamente la nota/warning de la última vez que hiciste el ejercicio (ej: "Pinchazo en hombro").
- [x] **Cliente - Volumen por Ejercicio en Resumen**: Mostrar los kg totales movidos por cada ejercicio individualmente en el resumen del entreno.
- [x] **E2E Stabilization**: Corregir regresiones en `privacy-consent.spec.js` y `workout-summary.spec.js`.

# Tareas: Bug Fixes (Maintenance & Reliability) [✓] Completado

- [x] **Missing Metrics Visibility**: 
    - [x] Reparado el fallo donde RIR (rpe) y Técnica (tempo) desaparecían en ejercicios de una sola serie.
    - [x] Añadida etiqueta "Set Único" y mejorado el diseño del resumen para legibilidad inmediata.
- [x] **Cache Invalidation Fix**:
    - [x] Implementada invalidación de caché en `WorkoutDetail.jsx` al eliminar entrenamientos.
    - [x] Asegurado que el Dashboard y el Historial se actualicen sin recargar.
- [x] **Test Stabilization**:
    - [x] Añadidos `data-testid` únicos en `ExerciseSummaryCard.jsx` para evitar colisiones en tests.
    - [x] Corregido flujo en `bug-fixes.spec.js` para asegurar la existencia de series antes de interactuar.

# Tareas: Sprint v4.7 (Client Management & QA Refactor) [✓] Completado

- [x] **Client Management UI Refactor**:
    - [x] Sustitución de botones individuales por menú vertical (`MoreVertical`) en `ClientRow.jsx`.
    - [x] Mejora de posicionamiento (absolute vs fixed) para evitar solapamientos en tests.
    - [x] Implementación de estados visuales claros (grayscale/opacity) para clientes inactivos.
- [x] **Integración de Backend**:
    - [x] Implementación real de "Generar Acceso" mediante llamada a Edge Function de Supabase.
    - [x] Corrección de políticas RLS para borrado de entrenamientos (`20260128174500`).
- [x] **QA & Estabilización E2E**:
    - [x] Creación de `e2e/client-features.spec.js` (Magic Link, Desactivación, Z-Index).
    - [x] Reparación de `workout-deletion.spec.js` (selector de título, selección de ejercicio y manejo de race conditions en login).
    - [x] Estabilización de `client-deactivation.spec.js` (manejo de modales e interceptación).

# Tareas: Sprint v4.8 (Offline Support & PWA) [✓] Completado

- [x] **Offline Support (PWA)**:
    - [x] Configurar `vite-plugin-pwa`.
    - [x] Implementar Service Worker para cache de assets.
    - [x] Estrategia de persistencia de datos offline (IndexedDB/Localforage) para entrenamientos.
    - [x] Sincronización en segundo plano al recuperar conexión.
- [x] **UX Fix: Visibilidad de botón borrar en series**: Asegurar que el botón de eliminar serie sea visible sin necesidad de hover (mejorar accesibilidad en móviles).

# Tareas: Sprint v4.9 (Performance Optimization) [✓] Completado

- [x] **Database Performance Audit**:
    - [x] Identificación y creación de índices faltantes en FKs (`20260204184833`).
    - [x] Endurecimiento de seguridad RLS (`strict-rls.spec.js`).
- [x] **Routine Loading Optimization**:
    - [x] Implementación de RPC `get_user_routines_with_details` para carga instantánea.
    - [x] Solución de problemas de timeout en cliente (E2E verificado).

# Tareas: Sprint v5.0 (Usability & Maintenance) [✓] Completado

- [x] **Calendar Month Navigation**:
    - [x] Habilitar navegación entre meses en el calendario de entrenamientos.
    - [x] Tests E2E actualizados para validar navegación dinámica.
- [x] **Resolver caché persistente de Vite**:
    - [x] Borrar `node_modules/.vite`
    - [x] Forzar recompilación con timestamp
    - [x] Renombrar hook a `useClientRoutinesV2` e invalidar `queryKey` para romper caché definitivamente.
- [x] **Fix Stability & Auth Bugs**:
    - [x] Manejar error `JWT issued at future` (clock skew) en `useUserRole.js` con reintento automático.
    - [x] Corregir advertencias de `input value null` en `WorkoutBlock.jsx`.
    - [x] Añadir validación defensiva en `useExercises.js` getNextPageParam.

# Tareas: Sprint v5.2 (Performance & Logic Hardening) [✓] Completado

- [x] **Performance Optimization**:
    - [x] Crear índices compuestos en `sets` para búsqueda de PR (`20260209160000`).
    - [x] Indexar `block_exercises(exercise_id)` y `workouts(user_id, date)` para historial rápido.
- [x] **Logic & UI Fixes**:
    - [x] **Weight is King**: Actualizar lógica de "Mejor Set" y tests unitarios para priorizar Peso sobre Reps/1RM.
    - [x] **Bug Fix**: Corregir `ReferenceError: Save is not defined` en `WorkoutDetail.jsx`.
    - [x] **Modales**: Implementar React Portal en `WorkoutDetail` para evitar problemas de z-index en E2E.
- [x] **RPC Urgent Fix**:
    - [x] Resolver error `COALESCE types uuid and boolean cannot be matched` en `get_user_routines_with_details` (`20260209170000`).

# ⚠️ Production Migration Checklist (Required for Deployment)

### Database Migrations (Run in order)
1.  [x] `20260204184833_performance_indexes.sql`
2.  [x] `20260204190240_fix_deep_join_performance.sql`
3.  [x] `20260204192323_fix_routine_loading_performance.sql`
4.  [x] `20260204192627_ultra_performance_rls_fix.sql`
5.  [x] `20260204200336_security_hardening.sql`
6.  [x] `20260204203000_add_pr_rpc.sql`
7.  [x] `20260204210000_ensure_rpc_indexes.sql`
8.  [x] `20260204220000_fix_search_paths.sql`
9.  [x] `20260205090000_hotfix_strict_rls.sql`
10. [x] `20260205094239_optimize_routine_query.sql`
11. [x] `20260205100000_routine_loading_rls_hardening.sql`
12. [x] `20260205110000_extreme_performance.sql`
13. [x] `20260205120000_hotfix_add_category.sql`
14. [x] `20260205130000_fix_accent_search.sql`
15. [x] `20260205161400_fix_rls_routine_visibility.sql`
16. [x] `20260205183000_fix_rls_insert.sql`
17. [x] `20260208190000_fix_get_exercise_pr_order.sql` (Fix: Prioridad Peso en PR) 
18. [x] `20260208201500_fix_chart_completed_sets.sql` (Fix: Solo sets completados en gráfica)
19. [x] `20260208203000_fix_chart_frankenstein_data.sql` (Fix: Agrupación correcta por workout)
20. [x] `20260209103000_fix_routine_visibility_rls.sql` (Fix: Visibilidad de rutinas asignadas)
21. [x] `20260209160000_performance_optimization_indexes.sql` (Optimización: Índices PR)
22. [x] `20260209170000_fix_routine_rpc_type_mismatch.sql` (Fix: Error COALESCE en modal)
23. [x] `20260211140000_muscle_group_standardization.sql` (Estandarización: Homologación de grupos musculares)
24. [x] `20260211150000_fix_coalesce_type_mismatch.sql` (Fix: Error COALESCE uuid/boolean en get_user_routines_with_details)
25. [x] `20260224100000_fix_rls_recursion.sql` (🚨 CRÍTICO Fix: Error 500 Stack Depth Limit en Rutinas)
26. [x] `20260224110000_fix_security_warnings.sql` (Fix Seguridad: Prevención inyecciones search_path y aislamiento extensions)
27. [x] `20260224133026_fix_missing_workout_columns.sql` (Fix: Recuperación test Playwright PGRST204 de metadatos faltantes)

### Final Actions
- [x] **Edge Functions**: Deploy `offline-sync`.
- [x] **Web App**: Build and Deploy (`npm run build`).
- [x] **Data Check**: Verificar que la tabla `exercises` tenga el campo `category` poblado tras migración 13.

# 📌 Backlog & V2 Offline
... (resto del backlog)
- [ ] **Offline UX Improvement (Historial)**: Mostrar entrenamientos pendientes de subida en la lista de Historial.
- [ ] **Offline V2 (Full Scope)**: Soporte offline completo para crear rutinas, editar perfil y otras acciones de escritura.
- [ ] **Entrenador - Historial de Asignaciones**: Vista dedicada para ver historial de rutinas enviadas (no solo workouts completados).
- [ ] **Cliente - Rutinas Favoritas**: Sistema para marcar/desmarcar plantillas favoritas y filtro en lista.
