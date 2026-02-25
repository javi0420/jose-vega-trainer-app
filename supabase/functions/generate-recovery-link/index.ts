import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Configuración de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NUEVO: Usamos Deno.serve (nativo) en lugar de importar 'serve'
Deno.serve(async (req) => {
  // 1. Manejar pre-flight request (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Crear Cliente Admin
    // Recuerda: En producción leerá las variables de la nube automáticamente
    const serviceRoleKey = Deno.env.get('MY_SERVICE_ROLE_KEY') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // Validación básica de seguridad
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("Faltan variables de entorno (MY_SERVICE_ROLE_KEY o SUPABASE_URL)");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 3. Leer datos del Frontend
    const { userId } = await req.json()

    if (!userId) {
      throw new Error("Falta el userId en la petición")
    }

    // 4. Verificar usuario
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !userData.user) {
      throw new Error("Usuario no encontrado (Revisa si el ID es correcto en Producción)")
    }

    // 5. Generar Link
    // Usamos variable de entorno si existe, o el fallback de producción
    // const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://joaquin-silva-trainer-app.pages.dev';
    const REDIRECT_URL = 'https://joaquin-silva-trainer-app.pages.dev/update-password';

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email,
      options: {
        redirectTo: REDIRECT_URL
      }
    })

    if (error) throw error

    // 6. Respuesta Exitosa
    return new Response(
      JSON.stringify({
        action_link: data.properties.action_link
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    // Manejo de errores
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})