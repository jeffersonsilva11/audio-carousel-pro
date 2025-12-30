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

interface ProfileIdentity {
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  displayMode: 'name_and_username' | 'username_only';
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
  format: keyof typeof DIMENSIONS
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
       <text x="${avatarX + avatarSize/2}" y="${y + avatarSize/2 + 8}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="600">${initials}</text>`;
  
  // Name and username text
  let identityText = '';
  const nameY = y + avatarSize/2 - 6;
  const usernameY = y + avatarSize/2 + 14;
  
  if (profile.displayMode === 'name_and_username' && profile.name) {
    identityText = `
      <text x="${textX}" y="${nameY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600">${escapeXml(profile.name)}</text>
      <text x="${textX}" y="${usernameY}" text-anchor="${textAnchor}" fill="${textColor}" opacity="0.7" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="500">@${escapeXml(profile.username)}</text>
    `;
  } else {
    const singleY = y + avatarSize/2 + 5;
    identityText = `
      <text x="${textX}" y="${singleY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600">@${escapeXml(profile.username)}</text>
    `;
  }
  
  return `
    <g class="profile-identity">
      ${avatarElement}
      ${identityText}
    </g>
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
  profile?: ProfileIdentity
): string {
  const { width, height } = DIMENSIONS[format];
  const { background, text: textColor } = STYLES[style];
  
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
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="${isSignature ? '700' : '500'}">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Slide counter
  const counter = `<text x="${width - 60}" y="60" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="500">${slideNumber}/${totalSlides}</text>`;

  // Profile identity
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format) : '';

  // Watermark for free users
  const watermark = hasWatermark ? `
    <g opacity="0.15">
      <text x="${width / 2}" y="${height - 40}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="600">Audisell</text>
    </g>
    <g opacity="0.08" transform="rotate(-30 ${width / 2} ${height / 2})">
      <text x="${width / 2}" y="${height / 2 - 100}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="80" font-weight="700">DEMO</text>
      <text x="${width / 2}" y="${height / 2 + 50}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="500">audisell.com</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${background}"/>
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carouselId, userId } = await req.json();

    if (!carouselId || !userId) {
      throw new Error('Missing carouselId or userId');
    }

    console.log(`Regenerating carousel ${carouselId} without watermark...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the carousel data
    const { data: carousel, error: fetchError } = await supabase
      .from('carousels')
      .select('*')
      .eq('id', carouselId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !carousel) {
      throw new Error('Carousel not found or access denied');
    }

    // Fetch user profile for identity
    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, instagram_handle, profile_image, avatar_position, display_mode')
      .eq('user_id', userId)
      .maybeSingle();

    const profile: ProfileIdentity | undefined = profileData?.instagram_handle ? {
      name: profileData.name || '',
      username: profileData.instagram_handle,
      photoUrl: profileData.profile_image || null,
      avatarPosition: (profileData.avatar_position || 'top-left') as ProfileIdentity['avatarPosition'],
      displayMode: (profileData.display_mode || 'name_and_username') as ProfileIdentity['displayMode'],
    } : undefined;

    const script = carousel.script as { slides: Array<{ type: string; text: string }> };
    if (!script || !script.slides) {
      throw new Error('No script found for this carousel');
    }

    const style = carousel.style as keyof typeof STYLES;
    const format = carousel.format as keyof typeof DIMENSIONS;

    const imageUrls: string[] = [];

    // Regenerate all slides without watermark
    for (let index = 0; index < script.slides.length; index++) {
      const slide = script.slides[index];
      const isSignature = slide.type === 'SIGNATURE';
      const svg = generateSlideSVG(
        slide.text,
        index + 1,
        script.slides.length,
        style,
        format,
        isSignature,
        false, // No watermark
        profile
      );

      const svgBuffer = new TextEncoder().encode(svg);

      // Upload to storage (overwrite existing)
      const fileName = `${userId}/${carouselId}/slide-${index + 1}.svg`;
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      imageUrls.push(`${publicUrl}?t=${Date.now()}`);
    }

    // Update carousel record
    const { error: updateError } = await supabase
      .from('carousels')
      .update({ 
        image_urls: imageUrls,
        has_watermark: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', carouselId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Regenerated', imageUrls.length, 'slides without watermark');

    return new Response(JSON.stringify({ 
      success: true, 
      imageUrls,
      slideCount: imageUrls.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in regenerate-without-watermark function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
