import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage GDPR privacy consent
 * @returns {Object} Consent state and mutation functions
 */
export function usePrivacyConsent() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch user profile to check consent status
    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('accepted_terms, accepted_at')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user?.id,
    });

    // Mutation to accept terms
    const acceptTermsMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('profiles')
                .update({
                    accepted_terms: true,
                    accepted_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate profile query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
        },
    });

    return {
        needsConsent: profile?.accepted_terms === false,
        isLoading,
        acceptTerms: acceptTermsMutation.mutate,
        isAccepting: acceptTermsMutation.isPending,
    };
}
