import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { startOfMonth, subDays, format, parseISO } from 'date-fns'

export const useClientStats = () => {
    const { user } = useAuth()

    return useQuery({
        queryKey: ['clientStats', user?.id],
        queryFn: async () => {
            if (!user) return null

            // 1. Fetch workouts: Ensure we have at least the current month plus some history
            const now = new Date()
            const thisMonthStart = startOfMonth(now)
            const thirtyDaysAgo = subDays(now, 30)

            // Use the earlier of the two dates to be safe
            const fetchStartDate = thisMonthStart < thirtyDaysAgo ? thisMonthStart : thirtyDaysAgo

            const { data: workouts, error } = await supabase
                .from('workouts')
                .select('id, date, name')
                .eq('user_id', user.id)
                .gte('date', fetchStartDate.toISOString())
                .order('date', { ascending: false })

            if (error) throw error

            // 2. Normalize data for calculations (Set of YYYY-MM-DD strings)
            // This avoids timezone shifts where a workout at 00:00 UTC might be previous day locally
            const workoutDateStrings = new Set(
                workouts.map(w => {
                    // If it's a timestamp, take only the date part
                    // w.date is expected to be ISO string like "2024-01-22T..." or just "2024-01-22"
                    return w.date.split('T')[0]
                })
            )

            // 3. Calculate "Workouts This Month" using local month string
            const currentMonthStr = format(now, 'yyyy-MM')
            const workoutsThisMonth = workouts.filter(w =>
                w.date.startsWith(currentMonthStr)
            ).length

            // 4. Robust Streak Calculation
            let streak = 0
            const todayStr = format(now, 'yyyy-MM-dd')
            const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd')

            // If worked out today, start from today. If not, start check from yesterday.
            // If didn't work out today OR yesterday, streak is 0.
            let dateToCheck = workoutDateStrings.has(todayStr) ? todayStr : yesterdayStr

            while (workoutDateStrings.has(dateToCheck)) {
                streak++
                // Move back one day
                const prevDay = subDays(parseISO(dateToCheck), 1)
                dateToCheck = format(prevDay, 'yyyy-MM-dd')
            }

            return {
                workoutsThisMonth,
                streak,
                recentWorkouts: workouts, // For the consistency chart
                totalWorkouts: workouts.length
            }
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5 // Cache for 5 mins
    })
}
