import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DIMENSIONS = {
  POST_SQUARE: { width: 1080, height: 1080 },
  POST_PORTRAIT: { width: 1080, height: 1350 },
  STORY: { width: 1080, height: 1920 }
};

const STYLES = {
  BLACK_WHITE: { background: '#0A0A0A', text: '#FFFFFF' },
  WHITE_BLACK: { background: '#FFFFFF', text: '#0A0A0A' }
};

// Available fonts with their families
const FONTS: Record<string, string> = {
  'inter': 'Inter, system-ui, sans-serif',
  'playfair': 'Playfair Display, serif',
  'roboto': 'Roboto, sans-serif',
  'montserrat': 'Montserrat, sans-serif',
  'oswald': 'Oswald, sans-serif',
  'lora': 'Lora, serif',
  'bebas': 'Bebas Neue, sans-serif',
  'poppins': 'Poppins, sans-serif',
};

// Gradient presets
const GRADIENT_PRESETS: Record<string, string[] | null> = {
  'none': null,
  'sunset': ['#ff6b6b', '#feca57', '#ff9ff3'],
  'ocean': ['#667eea', '#764ba2', '#f093fb'],
  'forest': ['#11998e', '#38ef7d'],
  'night': ['#232526', '#414345'],
  'fire': ['#f12711', '#f5af19'],
  'candy': ['#a18cd1', '#fbc2eb'],
  'custom': null,
};

// Plan daily limits
const PLAN_LIMITS: Record<string, number> = {
  'free': 1,
  'starter': 1,
  'creator': 8,
  'agency': 20,
};

interface ProfileIdentity {
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  displayMode: 'name_and_username' | 'username_only';
}

interface TemplateCustomization {
  fontId?: string;
  gradientId?: string;
  customGradientColors?: string[];
  slideImages?: (string | null)[];
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-IMAGES] ${step}${detailsStr}`);
};

// Get user's current plan from Stripe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserPlan(supabase: any, userId: string, email: string): Promise<{ plan: string; dailyUsed: number; dailyLimit: number; isAdmin: boolean }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get daily usage
  const { data: usageData } = await supabase
    .from("daily_usage")
    .select("carousels_created")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();
  
  const dailyUsed = (usageData as { carousels_created?: number })?.carousels_created || 0;
  
  // Check if admin
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  if (roleData) {
    return { plan: 'agency', dailyUsed, dailyLimit: 9999, isAdmin: true };
  }
  
  // Check Stripe subscription
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
  }
  
  try {
    const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
    }
    
    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
    }
    
    const price = subscriptions.data[0].items.data[0]?.price;
    const unitAmount = price?.unit_amount || 0;
    
    let plan = 'starter';
    if (unitAmount >= 19990) plan = 'agency';
    else if (unitAmount >= 9990) plan = 'creator';
    
    return { plan, dailyUsed, dailyLimit: PLAN_LIMITS[plan], isAdmin: false };
  } catch (error) {
    logStep('Error checking subscription', { error: String(error) });
    return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
  }
}

// Log usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logUsage(
  supabase: any,
  userId: string | null,
  action: string,
  resource: string | null,
  status: string,
  metadata: Record<string, unknown>,
  ipAddress: string | null
) {
  try {
    await supabase.from('usage_logs').insert({
      user_id: userId,
      action,
      resource,
      status,
      metadata,
      ip_address: ipAddress
    });
  } catch (error) {
    logStep('Failed to log usage', { error: String(error) });
  }
}

// Generate initials from name for default avatar
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Generate profile identity SVG elements
function generateProfileIdentitySVG(
  profile: ProfileIdentity,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  fontFamily: string
): string {
  if (!profile.username) return '';
  
  const { width, height } = DIMENSIONS[format];
  const { text: textColor } = STYLES[style];
  
  // Avatar size and positioning
  const avatarSize = 60;
  const padding = 40;
  const textGap = 12;
  
  // Calculate position based on avatarPosition
  let x = padding;
  let y = padding;
  let textAnchor = 'start';
  
  switch (profile.avatarPosition) {
    case 'top-right':
      x = width - padding;
      textAnchor = 'end';
      break;
    case 'bottom-left':
      y = height - padding - avatarSize;
      break;
    case 'bottom-right':
      x = width - padding;
      y = height - padding - avatarSize;
      textAnchor = 'end';
      break;
    default: // top-left
      break;
  }
  
  const isRight = profile.avatarPosition.includes('right');
  const avatarX = isRight ? x - avatarSize : x;
  const textX = isRight ? avatarX - textGap : x + avatarSize + textGap;
  
  // Avatar (circle with initials if no photo)
  const initials = getInitials(profile.name);
  const avatarElement = profile.photoUrl 
    ? `<clipPath id="avatarClip"><circle cx="${avatarX + avatarSize/2}" cy="${y + avatarSize/2}" r="${avatarSize/2}"/></clipPath>
       <image href="${profile.photoUrl}" x="${avatarX}" y="${y}" width="${avatarSize}" height="${avatarSize}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${avatarX + avatarSize/2}" cy="${y + avatarSize/2}" r="${avatarSize/2}" fill="${textColor}" opacity="0.15"/>
       <text x="${avatarX + avatarSize/2}" y="${y + avatarSize/2 + 8}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="24" font-weight="600">${initials}</text>`;
  
  // Name and username text
  let identityText = '';
  const nameY = y + avatarSize/2 - 6;
  const usernameY = y + avatarSize/2 + 14;
  
  if (profile.displayMode === 'name_and_username' && profile.name) {
    identityText = `
      <text x="${textX}" y="${nameY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">${escapeXml(profile.name)}</text>
      <text x="${textX}" y="${usernameY}" text-anchor="${textAnchor}" fill="${textColor}" opacity="0.7" font-family="${fontFamily}" font-size="16" font-weight="500">@${escapeXml(profile.username)}</text>
    `;
  } else {
    const singleY = y + avatarSize/2 + 5;
    identityText = `
      <text x="${textX}" y="${singleY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">@${escapeXml(profile.username)}</text>
    `;
  }
  
  return `
    <g class="profile-identity">
      ${avatarElement}
      ${identityText}
    </g>
  `;
}

// Generate gradient background SVG
function generateGradientBackground(
  width: number,
  height: number,
  gradientId: string,
  customColors?: string[]
): string {
  let colors: string[] | null = null;
  
  if (gradientId === 'custom' && customColors && customColors.length >= 2) {
    colors = customColors;
  } else if (gradientId !== 'none' && GRADIENT_PRESETS[gradientId]) {
    colors = GRADIENT_PRESETS[gradientId];
  }
  
  if (!colors || colors.length < 2) {
    return ''; // No gradient
  }
  
  const gradientStops = colors.map((color, index) => {
    const offset = (index / (colors!.length - 1)) * 100;
    return `<stop offset="${offset}%" stop-color="${color}"/>`;
  }).join('\n      ');
  
  return `
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
    <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.4)"/>
  `;
}

// Generate slide image background
function generateSlideImageBackground(
  imageUrl: string,
  width: number,
  height: number
): string {
  return `
    <defs>
      <clipPath id="imageClip">
        <rect width="${width}" height="${height}"/>
      </clipPath>
    </defs>
    <image href="${imageUrl}" x="0" y="0" width="${width}" height="${height}" clip-path="url(#imageClip)" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.5)"/>
  `;
}

// Generate SVG for each slide
function generateSlideSVG(
  text: string,
  slideNumber: number,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  isSignature: boolean = false,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background, text: textColor } = STYLES[style];
  
  // Get font family
  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  
  // Get slide-specific image if provided
  const slideImage = customization?.slideImages?.[slideNumber - 1];
  
  // Calculate font size based on text length and format
  const maxChars = text.length;
  let fontSize = 48;
  if (maxChars > 150) fontSize = 36;
  if (maxChars > 250) fontSize = 32;
  if (maxChars < 50) fontSize = 56;
  
  // Word wrap the text
  const words = text.split(' ');
  const maxWidth = width - 160; // padding
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Rough estimate: average char width is ~0.5 * fontSize
    const estimatedWidth = testLine.length * fontSize * 0.5;
    
    if (estimatedWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Calculate vertical positioning
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + fontSize;

  // Generate text elements
  const textElements = lines.map((line, index) => {
    const y = startY + (index * lineHeight);
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${isSignature ? '700' : '500'}">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Slide counter
  const counter = `<text x="${width - 60}" y="60" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="${fontFamily}" font-size="28" font-weight="500">${slideNumber}/${totalSlides}</text>`;

  // Profile identity
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily) : '';

  // Watermark for free users
  const watermark = hasWatermark ? `
    <g opacity="0.15">
      <text x="${width / 2}" y="${height - 40}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="24" font-weight="600">Audisell</text>
    </g>
    <g opacity="0.08" transform="rotate(-30 ${width / 2} ${height / 2})">
      <text x="${width / 2}" y="${height / 2 - 100}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="80" font-weight="700">DEMO</text>
      <text x="${width / 2}" y="${height / 2 + 50}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="40" font-weight="500">audisell.com</text>
    </g>` : '';

  // Determine background
  let backgroundElement = `<rect width="${width}" height="${height}" fill="${background}"/>`;
  
  // Priority: slide image > gradient > solid
  if (slideImage) {
    backgroundElement = generateSlideImageBackground(slideImage, width, height);
  } else if (customization?.gradientId && customization.gradientId !== 'none') {
    const gradientBg = generateGradientBackground(
      width, 
      height, 
      customization.gradientId, 
      customization.customGradientColors
    );
    if (gradientBg) {
      backgroundElement = gradientBg;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="avatarClip-${slideNumber}">
      <circle cx="0" cy="0" r="30"/>
    </clipPath>
  </defs>
  ${backgroundElement}
  ${counter}
  ${profileIdentity}
  <g>
    ${textElements}
  </g>
  ${watermark}
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert SVG to PNG using canvas-like approach
function svgToBase64(svg: string): string {
  return btoa(unescape(encodeURIComponent(svg)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip') || null;

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logUsage(supabase, null, 'generate_images', null, 'unauthorized', {}, ipAddress);
      throw new Error("Authentication required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      await logUsage(supabase, null, 'generate_images', null, 'unauthorized', { error: userError?.message }, ipAddress);
      throw new Error("Invalid authentication");
    }
    
    const user = userData.user;
    logStep('User authenticated', { userId: user.id });
    
    // Check rate limits
    const { plan, dailyUsed, dailyLimit, isAdmin } = await getUserPlan(supabase, user.id, user.email || '');
    logStep('Plan checked', { plan, dailyUsed, dailyLimit, isAdmin });
    
    if (!isAdmin && dailyUsed >= dailyLimit) {
      await logUsage(supabase, user.id, 'generate_images', null, 'rate_limited', { plan, dailyUsed, dailyLimit }, ipAddress);
      return new Response(JSON.stringify({ 
        error: 'Daily limit reached',
        code: 'RATE_LIMIT_EXCEEDED',
        details: { plan, dailyUsed, dailyLimit }
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      script, 
      style, 
      format, 
      carouselId, 
      userId, 
      hasWatermark = true, 
      profile, 
      customization,
      // Single slide regeneration params
      regenerateSingle = false,
      slideIndex,
      totalSlides
    } = await req.json();

    if (!script || !script.slides) {
      await logUsage(supabase, user.id, 'generate_images', carouselId, 'invalid_request', { error: 'No script provided' }, ipAddress);
      throw new Error('No script provided');
    }

    // Handle single slide regeneration
    if (regenerateSingle && typeof slideIndex === 'number') {
      logStep(`Regenerating single slide ${slideIndex + 1}`, { 
        watermark: hasWatermark, 
        profile: profile?.username 
      });
      
      const slide = script.slides[0]; // Single slide is passed as first element
      const isSignature = slide.type === 'SIGNATURE';
      const actualTotalSlides = totalSlides || 6;
      
      const svg = generateSlideSVG(
        slide.text,
        slideIndex + 1,
        actualTotalSlides,
        style as keyof typeof STYLES,
        format as keyof typeof DIMENSIONS,
        isSignature,
        hasWatermark,
        profile,
        customization
      );

      const svgBuffer = new TextEncoder().encode(svg);
      
      // Upload to storage with timestamp to bust cache
      const timestamp = Date.now();
      const fileName = `${userId}/${carouselId}/slide-${slideIndex + 1}-${timestamp}.svg`;
      
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (uploadError) {
        logStep('Upload error', { error: uploadError.message });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      logStep('Regenerated single slide', { slideIndex, publicUrl });
      
      await logUsage(supabase, user.id, 'regenerate_slide', carouselId, 'success', { 
        slideIndex,
        hasWatermark,
        plan
      }, ipAddress);

      // Return single slide result
      return new Response(JSON.stringify({ 
        slides: [{
          number: slideIndex + 1,
          type: slide.type,
          text: slide.text,
          imageUrl: publicUrl
        }],
        imageUrls: [publicUrl]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regular full carousel generation
    logStep(`Generating ${script.slides.length} slide images`, { 
      watermark: hasWatermark, 
      profile: profile?.username,
      customization: customization ? { font: customization.fontId, gradient: customization.gradientId } : null
    });

    const imageUrls: string[] = [];

    for (let index = 0; index < script.slides.length; index++) {
      const slide = script.slides[index];
      const isSignature = slide.type === 'SIGNATURE';
      const svg = generateSlideSVG(
        slide.text,
        index + 1,
        script.slides.length,
        style as keyof typeof STYLES,
        format as keyof typeof DIMENSIONS,
        isSignature,
        hasWatermark,
        profile,
        customization
      );

      // Convert to base64
      svgToBase64(svg);
      const svgBuffer = new TextEncoder().encode(svg);

      // Upload to storage
      const fileName = `${userId}/${carouselId}/slide-${index + 1}.svg`;
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (uploadError) {
        logStep('Upload error', { error: uploadError.message });
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      imageUrls.push(publicUrl);
    }

    // Update carousel with image URLs
    if (carouselId) {
      const { error: updateError } = await supabase
        .from('carousels')
        .update({ 
          image_urls: imageUrls,
          has_watermark: hasWatermark,
          slide_count: script.slides.length
        })
        .eq('id', carouselId);

      if (updateError) {
        logStep('Update error', { error: updateError.message });
      }
    }

    // Update daily usage counter (only for full carousel generation, not single slide)
    // Check if this carousel was previously FAILED - if so, don't increment (it's a retry)
    let shouldIncrementUsage = true;
    if (carouselId) {
      const { data: existingCarousel } = await supabase
        .from('carousels')
        .select('status')
        .eq('id', carouselId)
        .maybeSingle();

      if (existingCarousel?.status === 'FAILED') {
        logStep('Carousel is a retry from FAILED status, not incrementing usage');
        shouldIncrementUsage = false;
      }
    }

    if (shouldIncrementUsage) {
      const today = new Date().toISOString().split('T')[0];
      const { error: usageError } = await supabase
        .from('daily_usage')
        .upsert({
          user_id: user.id,
          usage_date: today,
          carousels_created: dailyUsed + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,usage_date'
        });

      if (usageError) {
        logStep('Usage update error', { error: usageError.message });
      }
    }

    const slides = script.slides.map((slide: { type: string; text: string }, index: number) => ({
      number: index + 1,
      type: slide.type,
      text: slide.text,
      imageUrl: imageUrls[index]
    }));

    logStep('Generated and uploaded slides', { count: slides.length });
    
    await logUsage(supabase, user.id, 'generate_images', carouselId, 'success', { 
      slideCount: slides.length,
      hasWatermark,
      plan,
      customization: customization ? { font: customization.fontId, gradient: customization.gradientId } : null
    }, ipAddress);

    return new Response(JSON.stringify({ slides, imageUrls }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logStep('Error in generate-carousel-images function', { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
