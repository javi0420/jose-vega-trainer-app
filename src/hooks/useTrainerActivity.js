import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useTrainerActivity() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['trainerActivity', user?.id],
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .rpc('get_trainer_activity', {
                    p_trainer_id: user.id,
                    p_limit: 100
                })

            if (error) throw error

            // Map flattened RPC response to the nested structure components expect
            return data.map(item => ({
                ...item,
                profiles: {
                    full_name: item.full_name,
                    avatar_url: item.avatar_url
                }
            }))
        },
        enabled: !!user
    })
}
