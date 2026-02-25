import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useExercises = (searchQuery = '') => {
    const queryClient = useQueryClient()
    const PAGE_SIZE = 20

    const exercisesQuery = useInfiniteQuery({
        queryKey: ['exercises', searchQuery],
        queryFn: async ({ pageParam = 0 }) => {
            if (searchQuery) {
                // Use the new RPC for accent-insensitive search
                const { data, error } = await supabase
                    .rpc('search_exercises', {
                        search_term: searchQuery,
                        p_offset: pageParam,
                        p_limit: PAGE_SIZE
                    })

                if (error) throw new Error(error.message)

                // RPC returns total_count in each row, extracting it from the first row if strictly needed for specific pagination UI,
                // otherwise infinite list just relies on data length for next page.
                const count = data?.[0]?.total_count || 0
                return { data, count, nextPage: pageParam + PAGE_SIZE }

            } else {
                // Standard efficient fetch
                const { data, error, count } = await supabase
                    .from('exercises')
                    .select('id, name, muscle_group, category, description, video_url', { count: 'exact' })
                    .eq('is_active', true)
                    .order('name', { ascending: true })
                    .range(pageParam, pageParam + PAGE_SIZE - 1)

                if (error) throw new Error(error.message)
                return { data, count, nextPage: pageParam + PAGE_SIZE }
            }
        },
        getNextPageParam: (lastPage, allPages) => {
            // Validación defensiva
            if (!lastPage || !lastPage.data) return undefined

            // If we fetched fewer items than PAGE_SIZE, we are at the end
            if (lastPage.data.length < PAGE_SIZE) return undefined
            // Alternatively check total count if available
            return lastPage.nextPage
        },
        initialPageParam: 0
    })

    const createExercise = useMutation({
        mutationFn: async (newExercise) => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data, error } = await supabase
                .from('exercises')
                .insert([{ ...newExercise, created_by: user?.id, is_active: true }])
                .select()
                .single()

            if (error) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] })
        }
    })

    const updateExercise = useMutation({
        mutationFn: async ({ id, ...updates }) => {
            const { data, error } = await supabase
                .from('exercises')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] })
        }
    })

    const deleteExercise = useMutation({
        mutationFn: async (id) => {
            // Soft delete: update is_active to false
            const { error } = await supabase
                .from('exercises')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw new Error(error.message)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises'] })
        }
    })

    return {
        ...exercisesQuery,
        // Helper to flatten pages for the UI
        exercises: exercisesQuery.data?.pages.flatMap(page => page.data) || [],
        createExercise,
        updateExercise,
        deleteExercise
    }
}
