import { get, set, update } from 'idb-keyval'
import { generateUUID } from '../utils/uuid'

const QUEUE_KEY = 'offline_mutation_queue'

export const offlineQueue = {
    async add(type, payload) {
        const mutation = {
            id: generateUUID(),
            type, // e.g., 'SAVE_WORKOUT'
            payload,
            createdAt: Date.now(),
            retryCount: 0
        }

        await update(QUEUE_KEY, (val) => {
            const queue = val || []
            queue.push(mutation)
            return queue
        })

        return mutation.id
    },

    async getAll() {
        return (await get(QUEUE_KEY)) || []
    },

    async remove(id) {
        await update(QUEUE_KEY, (val) => {
            const queue = val || []
            return queue.filter(m => m.id !== id)
        })
    },

    async clear() {
        await set(QUEUE_KEY, [])
    }
}
