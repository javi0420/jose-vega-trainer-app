import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useClients() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['clients', user?.id],
        queryFn: async () => {
            // Join trainer_clients with profiles to get client details
            const { data, error } = await supabase
                .from('trainer_clients')
                .select(`
                    client_id,
                    profiles:client_id (
                        id,
                        full_name,
                        avatar_url,
                        email,
                        is_active
                    )
                `)
                .eq('trainer_id', user.id)

            if (error) throw error

            // Flatten the structure safely (handles both array and object responses)
            return data.map(item => {
                const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                return profile;
            }).filter(Boolean);
        },
        enabled: !!user
    })
}
