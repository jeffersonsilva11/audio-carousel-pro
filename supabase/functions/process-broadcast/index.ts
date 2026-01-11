import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PROCESS-BROADCAST] ${step}${detailsStr}`);
};

interface BroadcastJob {
  id: string;
  type: "notification" | "email";
  status: string;
  target_plans: string[];
  target_all_users: boolean;
  notification_title_pt: string | null;
  notification_title_en: string | null;
  notification_title_es: string | null;
  notification_message_pt: string | null;
  notification_message_en: string | null;
  notification_message_es: string | null;
  notification_type: string | null;
  notification_action_url: string | null;
  email_subject_pt: string | null;
  email_subject_en: string | null;
  email_subject_es: string | null;
  email_template_key: string | null;
  email_template_data: Record<string, unknown> | null;
  total_recipients: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  batch_size: number;
  batch_delay_ms: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    logStep("Processing broadcast job", { jobId });

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch the job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("broadcast_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`);
    }

    if (job.status !== "pending" && job.status !== "processing") {
      logStep("Job already processed", { status: job.status });
      return new Response(
        JSON.stringify({ success: true, message: "Job already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update job status to processing
    await supabaseAdmin
      .from("broadcast_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // Create recipients if not already created
    if (job.total_recipients === 0) {
      logStep("Creating recipients");

      // Build query for target users
      let usersQuery = supabaseAdmin
        .from("auth.users")
        .select("id, email");

      // Get users based on target
      let targetUsers: Array<{ id: string; email: string }> = [];

      if (job.target_all_users || !job.target_plans || job.target_plans.length === 0) {
        // Get all users
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
        targetUsers = allUsers?.users?.map((u) => ({ id: u.id, email: u.email! })) || [];
      } else {
        // Get users by plan
        const { data: usersWithSubs } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, plan_id")
          .eq("status", "active");

        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();

        const activeSubUserIds = new Set(usersWithSubs?.map((s) => s.user_id) || []);
        const userPlanMap = new Map(usersWithSubs?.map((s) => [s.user_id, s.plan_id]) || []);

        targetUsers = (allUsers?.users || [])
          .filter((u) => {
            if (job.target_plans.includes("free")) {
              // Include users without active subscription
              if (!activeSubUserIds.has(u.id)) return true;
            }
            // Include users with matching plan
            const userPlan = userPlanMap.get(u.id);
            return userPlan && job.target_plans.includes(userPlan);
          })
          .map((u) => ({ id: u.id, email: u.email! }));
      }

      logStep("Found target users", { count: targetUsers.length });

      // Insert recipients in batches
      const recipientBatchSize = 100;
      for (let i = 0; i < targetUsers.length; i += recipientBatchSize) {
        const batch = targetUsers.slice(i, i + recipientBatchSize);
        await supabaseAdmin.from("broadcast_recipients").insert(
          batch.map((u) => ({
            job_id: jobId,
            user_id: u.id,
            email: u.email,
            status: "pending",
          }))
        );
      }

      // Update total recipients count
      await supabaseAdmin
        .from("broadcast_jobs")
        .update({ total_recipients: targetUsers.length })
        .eq("id", jobId);

      job.total_recipients = targetUsers.length;
    }

    // Process recipients in batches
    const batchSize = job.batch_size || 50;
    const batchDelay = job.batch_delay_ms || 1000;
    let processedCount = job.processed_count || 0;
    let successCount = job.success_count || 0;
    let failedCount = job.failed_count || 0;

    // Fetch pending recipients
    const { data: pendingRecipients } = await supabaseAdmin
      .from("broadcast_recipients")
      .select("id, user_id, email")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(batchSize);

    if (!pendingRecipients || pendingRecipients.length === 0) {
      // No more pending recipients, mark job as completed
      await supabaseAdmin
        .from("broadcast_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      logStep("Job completed", { successCount, failedCount });
      return new Response(
        JSON.stringify({ success: true, message: "Job completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing batch", { batchSize: pendingRecipients.length });

    // Process each recipient
    for (const recipient of pendingRecipients) {
      try {
        if (job.type === "notification") {
          // Insert notification for user
          await supabaseAdmin.from("notifications").insert({
            user_id: recipient.user_id,
            type: job.notification_type || "announcement",
            title_pt: job.notification_title_pt,
            title_en: job.notification_title_en,
            title_es: job.notification_title_es,
            message_pt: job.notification_message_pt,
            message_en: job.notification_message_en,
            message_es: job.notification_message_es,
            action_url: job.notification_action_url,
          });

          // Mark recipient as sent
          await supabaseAdmin
            .from("broadcast_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);

          successCount++;
        } else if (job.type === "email") {
          // Get user's preferred language
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("preferred_language")
            .eq("user_id", recipient.user_id)
            .single();

          const lang = profile?.preferred_language || "pt-BR";
          const templateData = job.email_template_data || {};

          // Select content based on language
          const subject =
            lang === "en"
              ? job.email_subject_en || job.email_subject_pt
              : lang === "es"
              ? job.email_subject_es || job.email_subject_pt
              : job.email_subject_pt;

          const title =
            lang === "en"
              ? (templateData as Record<string, string>).title_en || (templateData as Record<string, string>).title_pt
              : lang === "es"
              ? (templateData as Record<string, string>).title_es || (templateData as Record<string, string>).title_pt
              : (templateData as Record<string, string>).title_pt;

          const content =
            lang === "en"
              ? (templateData as Record<string, string>).content_en || (templateData as Record<string, string>).content_pt
              : lang === "es"
              ? (templateData as Record<string, string>).content_es || (templateData as Record<string, string>).content_pt
              : (templateData as Record<string, string>).content_pt;

          // Send email via send-smtp-email function
          const { error: emailError } = await supabaseAdmin.functions.invoke(
            "send-smtp-email",
            {
              body: {
                to: recipient.email,
                subject,
                template: job.email_template_key || "announcement",
                templateData: {
                  subject,
                  title,
                  content,
                  ctaText: (templateData as Record<string, string>).ctaText,
                  ctaUrl: (templateData as Record<string, string>).ctaUrl,
                  year: new Date().getFullYear(),
                },
              },
            }
          );

          if (emailError) {
            throw new Error(emailError.message);
          }

          // Mark recipient as sent
          await supabaseAdmin
            .from("broadcast_recipients")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", recipient.id);

          successCount++;
        }

        processedCount++;
      } catch (error) {
        logStep("Error processing recipient", {
          recipientId: recipient.id,
          error: String(error),
        });

        // Mark recipient as failed
        await supabaseAdmin
          .from("broadcast_recipients")
          .update({
            status: "failed",
            error_message: String(error),
          })
          .eq("id", recipient.id);

        failedCount++;
        processedCount++;
      }
    }

    // Update job progress
    await supabaseAdmin
      .from("broadcast_jobs")
      .update({
        processed_count: processedCount,
        success_count: successCount,
        failed_count: failedCount,
      })
      .eq("id", jobId);

    // Check if there are more recipients to process
    const { count: remainingCount } = await supabaseAdmin
      .from("broadcast_recipients")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("status", "pending");

    if (remainingCount && remainingCount > 0) {
      // Schedule next batch processing after delay
      // In production, this would be handled by a cron job or queue
      // For now, we'll recursively call ourselves after a delay
      setTimeout(async () => {
        try {
          await supabaseAdmin.functions.invoke("process-broadcast", {
            body: { jobId },
          });
        } catch (e) {
          logStep("Error scheduling next batch", { error: String(e) });
        }
      }, batchDelay);

      logStep("Batch processed, more remaining", {
        processed: processedCount,
        remaining: remainingCount,
      });
    } else {
      // All done
      await supabaseAdmin
        .from("broadcast_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      logStep("Job fully completed", { successCount, failedCount });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        successCount,
        failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
