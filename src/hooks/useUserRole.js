import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useUserRole() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['userRole', user?.id],
        queryFn: async () => {
            if (!user) return null

            const { data, error } = await supabase
                .from('profiles')
                .select('role, full_name, avatar_url, is_active')
                .eq('id', user.id)
                .single()

            if (error) {
                // PGRST303: JWT issued at future (clock skew)
                if (error.code === 'PGRST303') {
                    console.warn('Clock skew detected (JWT future). Retrying in 2 seconds...')
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    const retry = await supabase
                        .from('profiles')
                        .select('role, full_name, avatar_url, is_active')
                        .eq('id', user.id)
                        .single()

                    if (!retry.error) return retry.data
                    console.error('Retry failed after clock skew:', retry.error)
                }

                console.error('Error fetching user role:', error)
                return null
            }

            return data
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 60, // 1 hour (roles rarely change)
    })
}
