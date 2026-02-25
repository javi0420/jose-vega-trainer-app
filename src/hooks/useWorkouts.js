import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export const useRecentWorkouts = () => {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['workouts', user?.id],
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('workouts')
                .select('id, name, created_at, date, duration_seconds, status, feedback_notes, trainer_feedback_viewed_at, profiles(full_name, avatar_url)')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(50)

            if (error) {
                throw new Error(error.message)
            }

            return data
        },
        enabled: !!user, // Solo ejecutar si hay usuario
    })
}
