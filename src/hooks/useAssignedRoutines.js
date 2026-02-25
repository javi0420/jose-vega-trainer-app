import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook to fetch routines assigned to the current client by their trainer
 * @returns {Object} Query result with assigned routines data
 */
export function useAssignedRoutines() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['assignedRoutines', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assigned_routines')
        .select(`
          id,
          assignment_notes,
          assigned_at,
          viewed_at,
          client_feedback,
          client_feedback_at,
          routine:routines (
            id,
            name,
            description,
            category,
            tags,
            blocks:routine_blocks (
              id,
              order_index,
              routine_exercises (
                id,
                exercise_id,
                custom_exercise_name,
                position,
                notes,
                default_sets,
                default_reps,
                exercises (
                  id,
                  name,
                  muscle_group
                )
              )
            )
          ),
          trainer:profiles!assigned_by (
            id,
            full_name,
            email
          )
        `)
        .eq('client_id', user.id)
        .order('assigned_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user,
    retry: false, // Debugging: Fail fast
    onError: (err) => console.error("Error fetching assigned routines:", err)
  })
}

/**
 * Hook to mark an assigned routine as viewed
 */
export function useMarkRoutineViewed() {
  const { user } = useAuth()

  const markAsViewed = async (assignmentId) => {
    const { error } = await supabase
      .from('assigned_routines')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('client_id', user.id)
      .is('viewed_at', null) // Only update if not already viewed

    if (error) throw error
  }

  return { markAsViewed }
}

/**
 * Hook to update client feedback on an assigned routine
 */
export function useUpdateAssignedRoutineFeedback() {
  const { user } = useAuth()

  const updateFeedback = async (assignmentId, feedback) => {
    const { error } = await supabase
      .from('assigned_routines')
      .update({
        client_feedback: feedback,
        client_feedback_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('client_id', user.id)

    if (error) throw error
  }

  return { updateFeedback }
}
