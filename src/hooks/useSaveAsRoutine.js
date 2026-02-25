import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSaveAsRoutine() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ workoutId, routineName }) => {
            if (!user) throw new Error('Usuario no autenticado')

            const { data, error } = await supabase.rpc('create_routine_from_workout', {
                p_workout_id: workoutId,
                p_routine_name: routineName,
                p_user_id: user.id
            })

            if (error) throw error
            return data // Returns the new routine ID
        },
        onSuccess: () => {
            // Invalidate routines cache
            queryClient.invalidateQueries({ queryKey: ['routines', user?.id] })
        }
    })
}
