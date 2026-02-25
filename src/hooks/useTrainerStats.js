import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { subDays, startOfDay, format, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function useTrainerStats() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['trainerStats', user?.id],
        queryFn: async () => {
            if (!user) return null

            const sevenDaysAgo = subDays(new Date(), 7).toISOString()

            // 1. Fetch workouts from last 7 days for the chart
            const { data: recentWorkouts, error } = await supabase
                .rpc('get_trainer_stats_workouts', {
                    p_trainer_id: user.id,
                    p_start_date: sevenDaysAgo
                })

            if (error) throw error

            // 2. Aggregate for Chart (Last 7 Days)
            const chartData = []
            for (let i = 6; i >= 0; i--) {
                const day = subDays(new Date(), i)
                const count = recentWorkouts.filter(w => isSameDay(parseISO(w.date), day)).length
                chartData.push({
                    day: format(day, 'EEE', { locale: es }), // 'lun', 'mar'
                    count,
                    fullDate: day
                })
            }

            return {
                chartData,
                totalWorkoutsLast7Days: recentWorkouts.length
            }
        },
        enabled: !!user
    })
}
