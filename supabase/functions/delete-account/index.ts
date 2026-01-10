import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function logStep(step: string, details?: unknown) {
  console.log(`[DELETE-ACCOUNT] ${step}`, details ? JSON.stringify(details) : "");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      logStep("Auth error", { error: authError?.message });
      throw new Error("Invalid authorization token");
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body for confirmation
    const { confirmation } = await req.json().catch(() => ({ confirmation: "" }));

    // Require user to type their email as confirmation (LGPD/GDPR best practice)
    if (confirmation !== user.email) {
      logStep("Confirmation mismatch", { expected: user.email, received: confirmation });
      return new Response(
        JSON.stringify({
          success: false,
          error: "confirmation_required",
          message: "Please type your email address to confirm account deletion",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logStep("Confirmation verified, proceeding with deletion");

    // Delete user data in order (respecting foreign key constraints)

    // 1. Delete notifications
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    if (notifError) logStep("Error deleting notifications", { error: notifError.message });
    else logStep("Notifications deleted");

    // 2. Delete API usage logs
    const { error: apiError } = await supabaseClient
      .from("api_usage")
      .delete()
      .eq("user_id", user.id);
    if (apiError) logStep("Error deleting api_usage", { error: apiError.message });
    else logStep("API usage deleted");

    // 3. Delete daily usage
    const { error: usageError } = await supabaseClient
      .from("daily_usage")
      .delete()
      .eq("user_id", user.id);
    if (usageError) logStep("Error deleting daily_usage", { error: usageError.message });
    else logStep("Daily usage deleted");

    // 4. Get carousel IDs for image cleanup
    const { data: carousels } = await supabaseClient
      .from("carousels")
      .select("id")
      .eq("user_id", user.id);

    // 5. Delete carousel slide images from storage
    if (carousels && carousels.length > 0) {
      const carouselIds = carousels.map((c) => c.id);

      // Delete carousel_slide_images records
      const { error: slideImgError } = await supabaseClient
        .from("carousel_slide_images")
        .delete()
        .in("carousel_id", carouselIds);
      if (slideImgError) logStep("Error deleting carousel_slide_images", { error: slideImgError.message });
      else logStep("Carousel slide images records deleted");
    }

    // 6. Delete carousels
    const { error: carouselError } = await supabaseClient
      .from("carousels")
      .delete()
      .eq("user_id", user.id);
    if (carouselError) logStep("Error deleting carousels", { error: carouselError.message });
    else logStep("Carousels deleted", { count: carousels?.length || 0 });

    // 7. Delete user roles
    const { error: rolesError } = await supabaseClient
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);
    if (rolesError) logStep("Error deleting user_roles", { error: rolesError.message });
    else logStep("User roles deleted");

    // 8. Delete subscription
    const { error: subError } = await supabaseClient
      .from("subscriptions")
      .delete()
      .eq("user_id", user.id);
    if (subError) logStep("Error deleting subscription", { error: subError.message });
    else logStep("Subscription deleted");

    // 9. Delete profile
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("user_id", user.id);
    if (profileError) logStep("Error deleting profile", { error: profileError.message });
    else logStep("Profile deleted");

    // 10. Delete storage files (user's folder in slide-images)
    const { data: storageFiles } = await supabaseClient.storage
      .from("slide-images")
      .list(user.id);

    if (storageFiles && storageFiles.length > 0) {
      const filePaths = storageFiles.map((f) => `${user.id}/${f.name}`);
      const { error: storageError } = await supabaseClient.storage
        .from("slide-images")
        .remove(filePaths);
      if (storageError) logStep("Error deleting storage files", { error: storageError.message });
      else logStep("Storage files deleted", { count: filePaths.length });
    }

    // 11. Delete avatar from avatars bucket if exists
    const { data: avatarFiles } = await supabaseClient.storage
      .from("avatars")
      .list(user.id);

    if (avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map((f) => `${user.id}/${f.name}`);
      await supabaseClient.storage.from("avatars").remove(avatarPaths);
      logStep("Avatar files deleted");
    }

    // 12. Finally, delete the auth user (this must be last)
    const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      logStep("Error deleting auth user", { error: deleteUserError.message });
      throw new Error(`Failed to delete user account: ${deleteUserError.message}`);
    }

    logStep("Account deleted successfully", { userId: user.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account and all associated data have been permanently deleted",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
