import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function logStep(step: string, details?: any) {
  console.log(`[EXPORT-USER-DATA] ${step}`, details ? JSON.stringify(details) : '')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Function started')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      logStep('Auth error', { error: authError?.message })
      throw new Error('Invalid authorization token')
    }

    logStep('User authenticated', { userId: user.id, email: user.email })

    // Collect all user data
    const exportData: Record<string, any> = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profileError && profile) {
      exportData.profile = profile
      logStep('Profile fetched')
    }

    // Get carousels
    const { data: carousels, error: carouselsError } = await supabaseClient
      .from('carousels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!carouselsError && carousels) {
      exportData.carousels = carousels
      logStep('Carousels fetched', { count: carousels.length })
    }

    // Get daily usage
    const { data: dailyUsage, error: usageError } = await supabaseClient
      .from('daily_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_date', { ascending: false })

    if (!usageError && dailyUsage) {
      exportData.dailyUsage = dailyUsage
      logStep('Daily usage fetched', { count: dailyUsage.length })
    }

    // Get subscription data
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subError && subscription) {
      // Remove sensitive Stripe IDs for privacy
      exportData.subscription = {
        plan_tier: subscription.plan_tier,
        status: subscription.status,
        daily_limit: subscription.daily_limit,
        has_watermark: subscription.has_watermark,
        has_editor: subscription.has_editor,
        has_history: subscription.has_history,
        has_image_generation: subscription.has_image_generation,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        created_at: subscription.created_at,
      }
      logStep('Subscription fetched')
    }

    // Get API usage
    const { data: apiUsage, error: apiError } = await supabaseClient
      .from('api_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100) // Last 100 API calls

    if (!apiError && apiUsage) {
      exportData.apiUsage = apiUsage
      logStep('API usage fetched', { count: apiUsage.length })
    }

    // Get user roles
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role, created_at')
      .eq('user_id', user.id)

    if (!rolesError && roles) {
      exportData.roles = roles
      logStep('Roles fetched', { count: roles.length })
    }

    logStep('Export completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logStep('Error', { error: errorMessage })
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})
