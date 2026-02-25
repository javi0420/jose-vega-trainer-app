import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useRoutines() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['routines', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('routines')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}
