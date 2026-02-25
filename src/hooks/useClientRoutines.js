import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Force recompile: 2026-02-05 14:26 - MOVED FUNCTION OUTSIDE HOOK

// Helper function para getNextPageParam - DEBE estar fuera del hook
// para que React Query pueda usar la misma referencia
const calculateNextPage = (lastPage, allPages) => {
    console.log('[useClientRoutines] calculateNextPage called with:', { lastPage, allPages });

    // Validación ULTRA defensiva
    if (!lastPage) {
        console.warn('[useClientRoutines] lastPage is null/undefined');
        return undefined;
    }

    if (typeof lastPage !== 'object') {
        console.error('[useClientRoutines] lastPage is not an object:', typeof lastPage);
        return undefined;
    }

    if (!lastPage.ownedRoutines || !Array.isArray(lastPage.ownedRoutines)) {
        console.error('[useClientRoutines] ownedRoutines invalid:', lastPage.ownedRoutines);
        return undefined;
    }

    if (!lastPage.assignedRoutines || !Array.isArray(lastPage.assignedRoutines)) {
        console.error('[useClientRoutines] assignedRoutines invalid:', lastPage.assignedRoutines);
        return undefined;
    }

    // Check if both lists are empty
    if (lastPage.ownedRoutines.length === 0 && lastPage.assignedRoutines.length === 0) {
        console.log('[useClientRoutines] Both lists empty, no more pages');
        return undefined;
    }

    console.log('[useClientRoutines] Returning next page:', lastPage.nextPage);
    return lastPage.nextPage;
};

export function useClientRoutinesV2(clientId) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const PAGE_SIZE = 20;

    const query = useInfiniteQuery({
        queryKey: ['client_routines_v2', clientId],
        queryFn: async ({ pageParam = 0 }) => {
            console.log('[useClientRoutines] queryFn called with pageParam:', pageParam);

            // 1. Fetch "Created for/by Client" routines (Direct Ownership)
            const { data: ownedRoutines, error: ownedError } = await supabase
                .from('routines')
                .select('*')
                .eq('user_id', clientId)
                .order('created_at', { ascending: false })
                .range(pageParam, pageParam + PAGE_SIZE - 1);

            if (ownedError) throw ownedError;

            // 2. Fetch "Assigned" routines (Linked via assigned_routines table)
            // We assume similar pagination for assigned routines.
            const { data: assignedLinks, error: assignedError } = await supabase
                .from('assigned_routines')
                .select(`
                    id, 
                    created_at, 
                    assignment_notes,
                    client_feedback,
                    routines:routine_id (*) 
                `)
                .eq('client_id', clientId)
                .range(pageParam, pageParam + PAGE_SIZE - 1);
            // .order('created_at', { ascending: false }); // order by assignment time

            if (assignedError) throw assignedError;

            // Process assigned routines to match structure
            const assignedRoutines = assignedLinks.map(link => {
                if (!link.routines) return null;
                return {
                    ...link.routines,
                    is_assigned: true, // Flag to distinguish
                    assigned_at: link.created_at, // Use assignment date
                    assignment_id: link.id,
                    client_feedback: link.client_feedback,
                    original_routine_id: link.routines.id
                };
            }).filter(Boolean);

            const result = { ownedRoutines, assignedRoutines, nextPage: pageParam + PAGE_SIZE };
            console.log('[useClientRoutines] queryFn returning:', result);
            return result;
        },
        getNextPageParam: calculateNextPage, // ✅ USO DE FUNCIÓN EXTERNA
        initialPageParam: 0,
        enabled: !!clientId,
    });

    // Merge & Deduplicate across ALL pages
    const routines = query.data?.pages.flatMap(page => {
        // We merge per page temporarily, but real dedup happens on the full set?
        // Actually, we can just return all owned and assigned from pages, then dedup.
        return [...page.ownedRoutines, ...page.assignedRoutines];
    }) || [];

    // Deduplication Logic (Prefer assigned)
    // We use a Map keyed by routine ID. If we encounter an assigned one, we overwrite/keep it.
    const uniqueRoutinesMap = new Map();
    // Prioritize Assigned: Insert Owned first, then Assigned overwrites.
    routines.forEach(r => {
        if (r.is_assigned) {
            uniqueRoutinesMap.set(r.id, r);
        } else {
            if (!uniqueRoutinesMap.has(r.id)) {
                uniqueRoutinesMap.set(r.id, r);
            }
        }
    });

    // Sort final list
    const sortedRoutines = Array.from(uniqueRoutinesMap.values()).sort((a, b) => {
        const dateA = new Date(a.assigned_at || a.created_at);
        const dateB = new Date(b.assigned_at || b.created_at);
        return dateB - dateA;
    });

    const assignRoutineFromTemplate = useMutation({
        mutationFn: async ({ templateRoutineId }) => {
            // 1. Fetch Template Routine
            // 1. Fetch Template Routine (Manual Fetch to be safe)
            const { data: routine, error: routineError } = await supabase
                .from('routines')
                .select('*')
                .eq('id', templateRoutineId)
                .single();

            if (routineError) throw routineError;

            // Fetch Blocks manually
            const { data: blocks, error: blocksError } = await supabase
                .from('routine_blocks')
                .select('*')
                .eq('routine_id', templateRoutineId)
                .order('order_index');

            if (blocksError) throw blocksError;

            // Fetch Exercises for each block
            for (const block of blocks) {
                const { data: exercises, error: exError } = await supabase
                    .from('routine_exercises')
                    .select('*, exercises(*)')
                    .eq('block_id', block.id)
                    .order('position');
                if (exError) throw exError;
                block.routine_exercises = exercises;
            }
            routine.routine_blocks = blocks;

            // 2. Create new routine for client
            const { data: newRoutine, error: newRoutineError } = await supabase
                .from('routines')
                .insert({
                    user_id: clientId,
                    name: routine.name,
                    description: routine.description,
                    created_by_trainer: user?.id // Mark as created by trainer
                })
                .select()
                .single();

            if (newRoutineError) throw newRoutineError;

            // 3. Duplicate structure (Blocks & Exercises)
            for (const block of routine.routine_blocks) {
                const { data: newBlock, error: newBlockError } = await supabase
                    .from('routine_blocks')
                    .insert({
                        routine_id: newRoutine.id,
                        order_index: block.order_index,
                    })
                    .select()
                    .single();

                if (newBlockError) throw newBlockError;

                const exercisesToInsert = block.routine_exercises.map(re => ({
                    block_id: newBlock.id,
                    exercise_id: re.exercise_id,
                    custom_exercise_name: re.custom_exercise_name,
                    position: re.position,
                    notes: re.notes,
                    default_sets: re.default_sets,
                    default_reps: re.default_reps,
                    default_rpe: re.default_rpe,
                }));

                if (exercisesToInsert.length > 0) {
                    const { error: exError } = await supabase
                        .from('routine_exercises')
                        .insert(exercisesToInsert);

                    if (exError) throw exError;
                }
            }

            return newRoutine;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routines', clientId] });
        },
        onError: (err) => {
            // Error handled by caller
        }
    });

    const createEmptyRoutine = useMutation({
        mutationFn: async ({ name }) => {
            const { data, error } = await supabase
                .from('routines')
                .insert({
                    user_id: clientId,
                    name: name || 'Nueva Rutina',
                    description: '',
                    created_by_trainer: user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routines', clientId] });
        }
    });

    return {
        routines: sortedRoutines,
        isLoading: query.isLoading,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        assignRoutineFromTemplate,
        createEmptyRoutine
    };
}
