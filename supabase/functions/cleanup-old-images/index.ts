import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Cleanup Old Images Function
 *
 * This function deletes carousel images older than 30 days from storage
 * while keeping the carousel records in the database.
 *
 * Can be triggered by:
 * - Supabase cron job (pg_cron)
 * - Manual HTTP request with admin auth
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_TO_KEEP = 30;
const STORAGE_BUCKET = 'carousel-images';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-OLD-IMAGES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify authorization (only allow service role or admin)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Check if it's a user token (not service role)
      if (token !== supabaseServiceKey) {
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
          throw new Error("Unauthorized");
        }

        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          throw new Error("Admin access required");
        }
      }
    }

    logStep('Starting cleanup job');

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
    const cutoffIso = cutoffDate.toISOString();

    logStep('Cutoff date', { cutoffDate: cutoffIso });

    // Find carousels older than 30 days with images
    const { data: oldCarousels, error: fetchError } = await supabase
      .from('carousels')
      .select('id, user_id, image_urls, created_at')
      .lt('created_at', cutoffIso)
      .not('image_urls', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch old carousels: ${fetchError.message}`);
    }

    if (!oldCarousels || oldCarousels.length === 0) {
      logStep('No old carousels found to clean up');
      return new Response(JSON.stringify({
        success: true,
        message: 'No old images to clean up',
        deleted: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Found carousels to clean', { count: oldCarousels.length });

    let totalFilesDeleted = 0;
    let totalCarouselsProcessed = 0;
    const errors: string[] = [];

    for (const carousel of oldCarousels) {
      if (!carousel.image_urls || carousel.image_urls.length === 0) continue;

      const filePaths: string[] = [];

      // Extract file paths from URLs
      for (const url of carousel.image_urls) {
        try {
          // URL format: https://xxx.supabase.co/storage/v1/object/public/carousel-images/user_id/carousel_id/slide_1.svg
          const urlObj = new URL(url);
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/carousel-images\/(.+)/);
          if (pathMatch) {
            filePaths.push(pathMatch[1]);
          }
        } catch (e) {
          logStep('Failed to parse URL', { url, error: String(e) });
        }
      }

      if (filePaths.length > 0) {
        // Delete files from storage
        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filePaths);

        if (deleteError) {
          errors.push(`Carousel ${carousel.id}: ${deleteError.message}`);
          logStep('Failed to delete files', { carouselId: carousel.id, error: deleteError.message });
        } else {
          totalFilesDeleted += filePaths.length;

          // Clear image_urls from carousel record
          const { error: updateError } = await supabase
            .from('carousels')
            .update({
              image_urls: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', carousel.id);

          if (updateError) {
            errors.push(`Failed to update carousel ${carousel.id}: ${updateError.message}`);
          } else {
            totalCarouselsProcessed++;
          }
        }
      }
    }

    const result = {
      success: true,
      message: 'Cleanup completed',
      carouselsProcessed: totalCarouselsProcessed,
      filesDeleted: totalFilesDeleted,
      errors: errors.length > 0 ? errors : undefined,
      cutoffDate: cutoffIso
    };

    logStep('Cleanup completed', result);

    // Log cleanup event
    try {
      await supabase.from('usage_logs').insert({
        user_id: null,
        action: 'cleanup_old_images',
        resource: null,
        status: 'success',
        metadata: {
          carousels_processed: totalCarouselsProcessed,
          files_deleted: totalFilesDeleted,
          cutoff_date: cutoffIso,
          errors_count: errors.length
        },
        ip_address: null
      });
    } catch (e) {
      logStep('Failed to log cleanup event', { error: String(e) });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logStep('Error in cleanup function', { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
