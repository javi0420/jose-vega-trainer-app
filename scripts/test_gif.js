import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_LOCAL_SERVICE_KEY)

async function run() {
    const { data, error } = await supabase
        .from('exercises')
        .select('name, gif_url')
        .ilike('gif_url', '%.gif%')
        .limit(10)

    console.log(data)
}

run()
