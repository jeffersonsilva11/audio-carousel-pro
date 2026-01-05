import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULED-NOTIFICATIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Optional: Verify authorization for manual calls
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError) {
        // For scheduled calls from Supabase, there might be no auth header
        // or a service role token
        logStep("No user auth, proceeding as service call");
      } else if (userData.user) {
        // Check if user is admin
        const { data: roleData } = await supabaseClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }
      }
    }

    const results = {
      expiring_subscriptions: 0,
      daily_summary: 0,
    };

    // 1. Check expiring subscriptions
    logStep("Checking expiring subscriptions");

    const { data: expiringResult } = await supabaseClient.rpc('check_expiring_subscriptions');
    results.expiring_subscriptions = expiringResult || 0;
    logStep("Expiring subscriptions checked", { count: results.expiring_subscriptions });

    // 2. Send daily summary to active users who created carousels yesterday
    logStep("Checking daily summaries");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: usageData } = await supabaseClient
      .from("daily_usage")
      .select("user_id, carousels_created")
      .eq("usage_date", yesterdayStr)
      .gt("carousels_created", 0);

    if (usageData && usageData.length > 0) {
      for (const usage of usageData) {
        // Check if notification was already sent
        const { data: existingNotif } = await supabaseClient
          .from("notifications")
          .select("id")
          .eq("user_id", usage.user_id)
          .eq("type", "info")
          .like("title_pt", "%resumo%")
          .gte("created_at", yesterdayStr)
          .maybeSingle();

        if (!existingNotif) {
          await supabaseClient.rpc('create_notification', {
            p_user_id: usage.user_id,
            p_type: 'info',
            p_title_pt: '📊 Resumo de ontem',
            p_message_pt: `Você criou ${usage.carousels_created} carrossel(s) ontem. Continue criando conteúdo incrível!`,
            p_title_en: '📊 Yesterday\'s summary',
            p_message_en: `You created ${usage.carousels_created} carousel(s) yesterday. Keep creating amazing content!`,
            p_title_es: '📊 Resumen de ayer',
            p_message_es: `Creaste ${usage.carousels_created} carrusel(es) ayer. ¡Sigue creando contenido increíble!`,
            p_action_url: '/dashboard'
          });
          results.daily_summary++;
        }
      }
    }

    logStep("Daily summaries sent", { count: results.daily_summary });

    // 3. Check for inactive users (no activity in 7 days) - re-engagement
    logStep("Checking inactive users");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const { data: inactiveUsers } = await supabaseClient
      .from("profiles")
      .select("user_id, created_at")
      .lt("updated_at", sevenDaysAgoStr)
      .gt("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Created in last 30 days

    let reEngagementCount = 0;
    if (inactiveUsers && inactiveUsers.length > 0) {
      for (const profile of inactiveUsers) {
        // Check if already notified this week
        const { data: existingNotif } = await supabaseClient
          .from("notifications")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("type", "info")
          .like("title_pt", "%Sentimos sua falta%")
          .gte("created_at", sevenDaysAgoStr)
          .maybeSingle();

        if (!existingNotif) {
          await supabaseClient.rpc('create_notification', {
            p_user_id: profile.user_id,
            p_type: 'info',
            p_title_pt: '👋 Sentimos sua falta!',
            p_message_pt: 'Que tal criar um novo carrossel hoje? Transforme seus áudios em conteúdo incrível.',
            p_title_en: '👋 We miss you!',
            p_message_en: 'How about creating a new carousel today? Transform your audio into amazing content.',
            p_title_es: '👋 ¡Te echamos de menos!',
            p_message_es: '¿Qué tal crear un nuevo carrusel hoy? Transforma tus audios en contenido increíble.',
            p_action_url: '/create'
          });
          reEngagementCount++;
        }
      }
    }

    logStep("Re-engagement notifications sent", { count: reEngagementCount });

    return new Response(JSON.stringify({
      success: true,
      results: {
        ...results,
        re_engagement: reEngagementCount
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
