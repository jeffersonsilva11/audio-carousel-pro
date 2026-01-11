import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-EMAIL-QUEUE] ${step}${detailsStr}`);
};

// Replace template variables with actual values
function replaceTemplateVariables(
  template: string,
  data: Record<string, string | number | boolean>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

interface Enrollment {
  id: string;
  user_id: string;
  sequence_id: string;
  current_step: number;
  status: string;
  next_send_at: string;
  metadata: Record<string, unknown>;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  subject_pt: string;
  subject_en: string | null;
  subject_es: string | null;
  body_pt: string;
  body_en: string | null;
  body_es: string | null;
  template_id: string | null;
  is_active: boolean;
  conditions: Record<string, unknown>;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  preferred_language: string | null;
}

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  fromName: string;
  fromAddress: string;
}

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
    logStep("Starting email queue processing");

    // Get SMTP configuration
    const { data: settingsData } = await supabaseClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "use_custom_email_sending",
        "custom_email_from_name",
        "custom_email_from_address",
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_secure",
      ]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

    const useCustomEmail = settings.use_custom_email_sending === "true";

    if (!useCustomEmail) {
      logStep("Custom email sending disabled, skipping queue processing");
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: "Custom email sending is disabled"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!settings.smtp_host || !settings.smtp_user || !smtpPassword) {
      logStep("SMTP not configured");
      return new Response(JSON.stringify({
        success: false,
        error: "SMTP not configured"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const smtp: SMTPConfig = {
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || "465"),
      user: settings.smtp_user,
      password: smtpPassword,
      secure: settings.smtp_secure === "true",
      fromName: settings.custom_email_from_name || "Audisell",
      fromAddress: settings.custom_email_from_address || settings.smtp_user,
    };

    // Find enrollments ready to process
    const now = new Date().toISOString();
    const { data: enrollments, error: enrollError } = await supabaseClient
      .from("email_sequence_enrollments")
      .select("*")
      .eq("status", "active")
      .lte("next_send_at", now)
      .limit(50); // Process max 50 at a time

    if (enrollError) {
      throw new Error(`Error fetching enrollments: ${enrollError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      logStep("No enrollments to process");
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        message: "No emails to send"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found enrollments to process", { count: enrollments.length });

    // Get all sequence steps for the sequences we need
    const sequenceIds = [...new Set(enrollments.map((e: Enrollment) => e.sequence_id))];
    const { data: allSteps } = await supabaseClient
      .from("email_sequence_steps")
      .select("*")
      .in("sequence_id", sequenceIds)
      .eq("is_active", true)
      .order("step_order");

    // Get user profiles for all users
    const userIds = enrollments.map((e: Enrollment) => e.user_id);
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name, preferred_language")
      .in("user_id", userIds);

    // Get user emails from auth
    const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
    const userEmailMap: Record<string, string> = {};
    authUsers?.users?.forEach(u => {
      if (u.email) userEmailMap[u.id] = u.email;
    });

    // Get subscriptions to check conditions
    const { data: subscriptions } = await supabaseClient
      .from("subscriptions")
      .select("user_id, tier, status")
      .in("user_id", userIds)
      .eq("status", "active");

    const subscriptionMap: Record<string, string> = {};
    subscriptions?.forEach((s: { user_id: string; tier: string }) => {
      subscriptionMap[s.user_id] = s.tier;
    });

    // Get early access spots remaining
    const { count: activeCreatorCount } = await supabaseClient
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("tier", ["creator", "agency"])
      .eq("status", "active");

    const totalSpots = parseInt(settings.early_access_total_spots || "500");
    const spotsRemaining = Math.max(0, totalSpots - (activeCreatorCount || 0));

    // Process each enrollment
    let processed = 0;
    let failed = 0;
    const siteUrl = Deno.env.get("SITE_URL") || "https://audisell.com";

    for (const enrollment of enrollments as Enrollment[]) {
      try {
        const nextStepOrder = enrollment.current_step + 1;

        // Find the next step
        const step = (allSteps as SequenceStep[])?.find(
          s => s.sequence_id === enrollment.sequence_id && s.step_order === nextStepOrder
        );

        if (!step) {
          // No more steps, mark as completed
          await supabaseClient
            .from("email_sequence_enrollments")
            .update({
              status: "completed",
              completed_at: now,
            })
            .eq("id", enrollment.id);

          logStep("Enrollment completed (no more steps)", { enrollmentId: enrollment.id });
          continue;
        }

        // Check conditions
        if (step.conditions && Object.keys(step.conditions).length > 0) {
          const conditions = step.conditions as { not_subscribed_to?: string[] };

          // Check "not_subscribed_to" condition
          if (conditions.not_subscribed_to) {
            const userTier = subscriptionMap[enrollment.user_id];
            if (userTier && conditions.not_subscribed_to.includes(userTier)) {
              // User has subscription, skip this step and mark as converted
              await supabaseClient
                .from("email_sequence_enrollments")
                .update({
                  status: "converted",
                  completed_at: now,
                })
                .eq("id", enrollment.id);

              logStep("Enrollment converted (user subscribed)", {
                enrollmentId: enrollment.id,
                userTier
              });
              continue;
            }
          }
        }

        // Get user profile
        const profile = (profiles as UserProfile[])?.find(p => p.user_id === enrollment.user_id);
        const userEmail = userEmailMap[enrollment.user_id];

        if (!userEmail) {
          logStep("User email not found, skipping", { userId: enrollment.user_id });
          continue;
        }

        // Determine language
        const lang = profile?.preferred_language || "pt-BR";
        const langSuffix = lang === "en" ? "_en" : lang === "es" ? "_es" : "_pt";

        // Get subject and body based on language
        let subject = step.subject_pt;
        let body = step.body_pt;

        if (lang === "en" && step.subject_en) {
          subject = step.subject_en;
          body = step.body_en || step.body_pt;
        } else if (lang === "es" && step.subject_es) {
          subject = step.subject_es;
          body = step.body_es || step.body_pt;
        }

        // If step has template_id, try to load HTML template from email_templates
        let emailHtml = body;
        let emailSubject = subject;

        if (step.template_id) {
          const { data: template } = await supabaseClient
            .from("email_templates")
            .select("subject, html_content")
            .eq("template_key", step.template_id)
            .eq("is_active", true)
            .single();

          if (template) {
            emailSubject = template.subject;
            emailHtml = template.html_content;
          }
        }

        // Prepare template variables
        const firstName = profile?.full_name?.split(" ")[0] || "";
        const templateData: Record<string, string | number> = {
          name: firstName ? `, ${firstName}` : "",
          fromName: smtp.fromName,
          dashboard_url: `${siteUrl}/dashboard`,
          dashboardUrl: `${siteUrl}/dashboard`,
          early_access_url: `${siteUrl}/pricing`,
          earlyAccessUrl: `${siteUrl}/pricing`,
          spots_remaining: spotsRemaining.toString(),
          spotsRemaining: spotsRemaining.toString(),
          siteUrl: siteUrl,
          year: new Date().getFullYear(),
        };

        // Replace variables
        emailSubject = replaceTemplateVariables(emailSubject, templateData);
        emailHtml = replaceTemplateVariables(emailHtml, templateData);

        // If body is plain text (not HTML), wrap in basic HTML
        if (!emailHtml.includes("<html") && !emailHtml.includes("<body")) {
          emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎙️ ${smtp.fromName}</h1>
    </div>
    <div style="padding: 40px 30px;">
      ${emailHtml.replace(/\n/g, "<br>")}
    </div>
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} ${smtp.fromName}. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>`;
        }

        // Send email
        logStep("Sending email", { to: userEmail, step: step.step_order });

        const client = new SMTPClient({
          connection: {
            hostname: smtp.host,
            port: smtp.port,
            tls: smtp.secure,
            auth: {
              username: smtp.user,
              password: smtp.password,
            },
          },
        });

        await client.send({
          from: `${smtp.fromName} <${smtp.fromAddress}>`,
          to: userEmail,
          subject: emailSubject,
          content: "auto",
          html: emailHtml,
        });

        await client.close();

        // Calculate next send time
        const nextStep = (allSteps as SequenceStep[])?.find(
          s => s.sequence_id === enrollment.sequence_id && s.step_order === nextStepOrder + 1
        );

        let updateData: Record<string, unknown> = {
          current_step: nextStepOrder,
        };

        if (nextStep) {
          // Schedule next step
          const nextSendAt = new Date();
          nextSendAt.setHours(nextSendAt.getHours() + nextStep.delay_hours);
          updateData.next_send_at = nextSendAt.toISOString();
        } else {
          // No more steps, mark as completed
          updateData.status = "completed";
          updateData.completed_at = now;
        }

        await supabaseClient
          .from("email_sequence_enrollments")
          .update(updateData)
          .eq("id", enrollment.id);

        processed++;
        logStep("Email sent successfully", {
          enrollmentId: enrollment.id,
          step: nextStepOrder,
          to: userEmail
        });

      } catch (emailError) {
        failed++;
        logStep("Error processing enrollment", {
          enrollmentId: enrollment.id,
          error: emailError instanceof Error ? emailError.message : String(emailError)
        });
      }
    }

    logStep("Queue processing complete", { processed, failed });

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
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
