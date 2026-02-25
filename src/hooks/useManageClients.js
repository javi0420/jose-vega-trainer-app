import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useManageClients() {
    const queryClient = useQueryClient()

    // Mutation for creating a new client
    const createClient = useMutation({
        mutationFn: async ({ email, fullName }) => {
            const defaultPassword = import.meta.env.VITE_DEFAULT_PASSWORD;

            if (!defaultPassword) {
                console.error('La variable de entorno VITE_DEFAULT_PASSWORD no está configurada.');
                throw new Error('Error de configuración: VITE_DEFAULT_PASSWORD no definida.');
            }

            const { data, error } = await supabase.rpc('create_client_as_trainer', {
                p_email: email,
                p_full_name: fullName,
                p_default_password: defaultPassword
            })

            if (error) {
                console.error('Supabase RPC Error:', error)
                throw new Error(error.message || 'Error al crear el cliente en el servidor.')
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
        }
    })

    // Mutation for updating a client profile
    const updateClient = useMutation({
        mutationFn: async ({ id, fullName, email }) => {
            const { data, error } = await supabase
                .from('profiles')
                .update({ full_name: fullName, email: email })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['trainerActivity'] })
        }
    })

    // Mutation for deleting (unlinking) a client
    // Note: This only removes the association in trainer_clients
    const unlinkClient = useMutation({
        mutationFn: async (clientId) => {
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase
                .from('trainer_clients')
                .delete()
                .eq('trainer_id', user.id)
                .eq('client_id', clientId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['trainerActivity'] })
        }
    })

    // Mutation for completely deleting a client (Auth + Profile + Data)
    const deleteClientPermanently = useMutation({
        mutationFn: async (clientId) => {
            const { error } = await supabase.rpc('delete_client_completely', {
                p_client_id: clientId
            })

            if (error) {
                console.error('Supabase RPC Error (Delete):', error)
                throw new Error(error.message || 'Error al eliminar el cliente permanentemente.')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
            queryClient.invalidateQueries({ queryKey: ['trainerActivity'] })
        }
    })

    // Mutation for toggling client active status
    const toggleClientStatus = useMutation({
        mutationFn: async ({ id, isActive }) => {
            const { data, error } = await supabase
                .from('profiles')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] })
        }
    })

    return {
        createClient,
        updateClient,
        unlinkClient,
        deleteClientPermanently,
        toggleClientStatus
    }
}
