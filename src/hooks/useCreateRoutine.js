import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useCreateRoutine() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, description, category, tags }) => {
            const { data, error } = await supabase
                .from('routines')
                .insert([
                    {
                        user_id: user?.id,
                        name,
                        description,
                        category,
                        tags
                    },
                ]);
            if (error) throw error;
            return data;
        },
        // Invalidate the routines list so it refreshes
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routines', user?.id] });
        },
    });
}
