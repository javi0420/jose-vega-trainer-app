import { useEffect, useState } from 'react'
import { useNetworkStatus } from './useNetworkStatus'
import { offlineQueue } from '../lib/offlineQueue'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export function useOfflineSync() {
    const isOnline = useNetworkStatus()
    const [isSyncing, setIsSyncing] = useState(false)

    useEffect(() => {
        if (isOnline) {
            processQueue()
        }
    }, [isOnline])

    const processQueue = async () => {
        if (isSyncing) return

        const queue = await offlineQueue.getAll()
        if (queue.length === 0) return

        setIsSyncing(true)
        const toastId = toast.loading('Recuperando conexión: Sincronizando datos...', { id: 'offline-sync' })
        let successCount = 0

        for (const item of queue) {
            try {
                if (item.type === 'SAVE_WORKOUT') {
                    console.log('Syncing workout:', item.payload)
                    const { error } = await supabase.rpc('save_full_workout', item.payload)
                    if (error) throw error
                    successCount++
                }

                await offlineQueue.remove(item.id)
            } catch (error) {
                console.error('Sync failed for item', item.id, error)
                // Keep in queue for retry, unless it's a validation error?
                // For safety in this iteration, we leave it.
            }
        }

        setIsSyncing(false)

        const remaining = await offlineQueue.getAll()
        if (remaining.length === 0) {
            toast.success('¡Todo sincronizado!', { id: 'offline-sync' })
        } else {
            if (successCount > 0) {
                toast.success(`Sincronizados ${successCount} elementos`, { id: 'offline-sync' })
            }
            toast.error('Pendientes de sincronizar: ' + remaining.length, { id: 'offline-sync', duration: 4000 })
        }
    }

    return { isSyncing }
}
