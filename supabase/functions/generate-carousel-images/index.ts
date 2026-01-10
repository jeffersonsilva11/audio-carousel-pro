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

// Gradient presets - MUST match frontend constants.ts
const GRADIENT_PRESETS: Record<string, string[] | null> = {
  // None/Custom
  'none': null,
  'custom': null,

  // Warm tones
  'sunset': ['#ff6b6b', '#feca57'],
  'fire': ['#f12711', '#f5af19'],
  'peach': ['#ffecd2', '#fcb69f'],
  'coral': ['#ff9a9e', '#fad0c4'],
  'mango': ['#ffe259', '#ffa751'],

  // Cool tones
  'ocean': ['#667eea', '#764ba2'],
  'frost': ['#c2e9fb', '#a1c4fd'],
  'sky': ['#56ccf2', '#2f80ed'],
  'electric': ['#4776e6', '#8e54e9'],
  'midnight': ['#0f2027', '#203a43', '#2c5364'],

  // Nature tones
  'forest': ['#11998e', '#38ef7d'],
  'meadow': ['#a8e063', '#56ab2f'],
  'mint': ['#00b09b', '#96c93d'],
  'aurora': ['#7f7fd5', '#86a8e7', '#91eae4'],

  // Dark/Professional
  'night': ['#232526', '#414345'],
  'charcoal': ['#3a3a3a', '#1a1a1a'],
  'slate': ['#373b44', '#4286f4'],
  'noir': ['#000000', '#434343'],

  // Pastel/Soft
  'candy': ['#a18cd1', '#fbc2eb'],
  'lavender': ['#e0c3fc', '#8ec5fc'],
  'cotton': ['#ffecd2', '#fcb69f'],
  'rose': ['#ff9a9e', '#fecfef'],
  'blush': ['#fbc2eb', '#a6c1ee'],

  // Bold/Vibrant
  'neon': ['#00f260', '#0575e6'],
  'rave': ['#fc466b', '#3f5efb'],
  'cyber': ['#00d9ff', '#9d00ff'],
  'magma': ['#f857a6', '#ff5858'],
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

// Layout template types
type CoverTemplateType = 'cover_full_image' | 'cover_split_images' | 'cover_gradient_overlay';
type ContentTemplateType = 'content_image_top' | 'content_text_top' | 'content_split' | 'content_text_only';

interface TemplateCustomization {
  fontId?: string;
  gradientId?: string;
  customGradientColors?: string[];
  slideImages?: (string | null)[];
  textAlignment?: 'left' | 'center' | 'right';
  showNavigationDots?: boolean;
  showNavigationArrow?: boolean;
  // New layout templates (Creator+ only)
  coverTemplate?: CoverTemplateType;
  contentTemplate?: ContentTemplateType;
}

interface SlideData {
  number: number;
  type: string;
  text: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-IMAGES] ${step}${detailsStr}`);
};

// Fetch an image URL and convert to base64 data URI for SVG embedding
async function imageUrlToBase64(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    logStep('Fetching image for base64 conversion', { url: url.substring(0, 100) });

    const response = await fetch(url);
    if (!response.ok) {
      logStep('Failed to fetch image', { status: response.status });
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    logStep('Image converted to base64', { size: base64.length, contentType });
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    logStep('Error converting image to base64', { error: String(error) });
    return null;
  }
}

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
    return { plan: 'creator', dailyUsed, dailyLimit: 9999, isAdmin: true };
  }
  
  // Check Stripe subscription
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return { plan: 'free', dailyUsed, dailyLimit: PLAN_LIMITS['free'], isAdmin: false };
  }
  
  try {
    const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
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
  fontFamily: string,
  forceWhiteText: boolean = false
): string {
  if (!profile.username) return '';

  const { width, height } = DIMENSIONS[format];
  // Use white text when forced (gradient/image backgrounds) or based on style
  const textColor = forceWhiteText ? '#FFFFFF' : STYLES[style].text;

  // Scale factor based on format - STORY needs bigger elements due to taller canvas
  const scaleFactors: Record<string, number> = {
    POST_SQUARE: 1.0,      // 1080x1080 - base
    POST_PORTRAIT: 1.15,   // 1080x1350 - 15% bigger
    STORY: 1.4             // 1080x1920 - 40% bigger
  };
  const scale = scaleFactors[format] || 1.0;

  // Avatar size and positioning - SCALED for each format (increased 25% for better visibility)
  const avatarSize = Math.round(100 * scale);
  const padding = Math.round(55 * scale);
  const textGap = Math.round(16 * scale);

  // Text sizes - SCALED for each format (increased 25% for better readability)
  const nameFontSize = Math.round(30 * scale);
  const usernameFontSize = Math.round(24 * scale);
  const initialsFontSize = Math.round(40 * scale);

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

  // Avatar (circle with initials if no photo) - SCALED sizes
  const initials = getInitials(profile.name);
  const avatarElement = profile.photoUrl
    ? `<clipPath id="avatarClip"><circle cx="${avatarX + avatarSize/2}" cy="${y + avatarSize/2}" r="${avatarSize/2}"/></clipPath>
       <image href="${profile.photoUrl}" x="${avatarX}" y="${y}" width="${avatarSize}" height="${avatarSize}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${avatarX + avatarSize/2}" cy="${y + avatarSize/2}" r="${avatarSize/2}" fill="${textColor}" opacity="0.15"/>
       <text x="${avatarX + avatarSize/2}" y="${y + avatarSize/2 + initialsFontSize/3}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="${initialsFontSize}" font-weight="600">${initials}</text>`;

  // Name and username text - SCALED sizes for better readability
  let identityText = '';
  const nameY = y + avatarSize/2 - Math.round(8 * scale);
  const usernameY = y + avatarSize/2 + Math.round(18 * scale);

  if (profile.displayMode === 'name_and_username' && profile.name) {
    identityText = `
      <text x="${textX}" y="${nameY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${nameFontSize}" font-weight="700">${escapeXml(profile.name)}</text>
      <text x="${textX}" y="${usernameY}" text-anchor="${textAnchor}" fill="${textColor}" opacity="0.8" font-family="${fontFamily}" font-size="${usernameFontSize}" font-weight="500">@${escapeXml(profile.username)}</text>
    `;
  } else {
    const singleY = y + avatarSize/2 + Math.round(6 * scale);
    identityText = `
      <text x="${textX}" y="${singleY}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${nameFontSize}" font-weight="600">@${escapeXml(profile.username)}</text>
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
  customColors?: string[],
  slideNumber: number = 1
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
      <linearGradient id="bgGradient-${slideNumber}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradientStops}
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGradient-${slideNumber})"/>
    <rect width="${width}" height="${height}" fill="rgba(0,0,0,0.4)"/>
  `;
}

// Generate slide image background with gradient overlay for cover
function generateSlideImageBackground(
  imageUrl: string,
  width: number,
  height: number,
  slideNumber: number = 1,
  isCoverSlide: boolean = false
): string {
  // For cover slide, use gradient from transparent top to dark bottom
  // For content slides, use uniform dark overlay
  const overlayElement = isCoverSlide
    ? `
    <defs>
      <linearGradient id="coverOverlay-${slideNumber}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="40%" stop-color="rgba(0,0,0,0.3)"/>
        <stop offset="70%" stop-color="rgba(0,0,0,0.6)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#coverOverlay-${slideNumber})"/>`
    : `<rect width="${width}" height="${height}" fill="rgba(0,0,0,0.55)"/>`;

  return `
    <defs>
      <clipPath id="imageClip-${slideNumber}">
        <rect width="${width}" height="${height}"/>
      </clipPath>
    </defs>
    <image href="${imageUrl}" x="0" y="0" width="${width}" height="${height}" clip-path="url(#imageClip-${slideNumber})" preserveAspectRatio="xMidYMid slice"/>
    ${overlayElement}
  `;
}

// Calculate dynamic font size based on text length and slide type
// INCREASED base sizes for more impactful titles
function calculateFontSize(
  textLength: number,
  slideType: 'cover' | 'content',
  format: keyof typeof DIMENSIONS
): number {
  const baseSizes: Record<string, { cover: number; content: number }> = {
    POST_SQUARE: { cover: 72, content: 48 },
    POST_PORTRAIT: { cover: 80, content: 52 },
    STORY: { cover: 88, content: 56 }
  };

  const base = baseSizes[format]?.[slideType] || 52;

  // Adjust for text length - less aggressive reduction
  if (textLength > 400) return Math.round(base * 0.7);
  if (textLength > 300) return Math.round(base * 0.8);
  if (textLength > 200) return Math.round(base * 0.9);
  if (textLength > 100) return Math.round(base * 0.95);
  if (textLength < 50) return Math.round(base * 1.1);

  return base;
}

// Word wrap with better estimation
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  const avgCharWidth = fontSize * 0.52;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Generate navigation dots SVG - SCALED by format
function generateNavigationDots(
  width: number,
  height: number,
  currentSlide: number,
  totalSlides: number,
  color: string = '#FFFFFF',
  format: keyof typeof DIMENSIONS = 'POST_SQUARE'
): string {
  // Scale factor based on format
  const scaleFactors: Record<string, number> = {
    POST_SQUARE: 1.0,
    POST_PORTRAIT: 1.15,
    STORY: 1.4
  };
  const scale = scaleFactors[format] || 1.0;

  const dotSize = Math.round(8 * scale);
  const dotGap = Math.round(12 * scale);
  const bottomPadding = Math.round(45 * scale);
  const totalWidth = totalSlides * dotSize + (totalSlides - 1) * dotGap;
  const startX = (width - totalWidth) / 2;
  const y = height - bottomPadding;

  const dots = Array.from({ length: totalSlides }, (_, i) => {
    const x = startX + i * (dotSize + dotGap) + dotSize / 2;
    const opacity = i === currentSlide - 1 ? '1' : '0.4';
    const size = i === currentSlide - 1 ? dotSize : dotSize * 0.75;
    return `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="${opacity}"/>`;
  }).join('\n    ');

  return `<g class="navigation-dots">${dots}</g>`;
}

// Generate navigation arrow indicator SVG - SCALED by format
function generateNavigationArrow(
  width: number,
  height: number,
  color: string = '#FFFFFF',
  format: keyof typeof DIMENSIONS = 'POST_SQUARE'
): string {
  // Scale factor based on format
  const scaleFactors: Record<string, number> = {
    POST_SQUARE: 1.0,
    POST_PORTRAIT: 1.15,
    STORY: 1.4
  };
  const scale = scaleFactors[format] || 1.0;

  const arrowSize = Math.round(40 * scale);
  const rightPadding = Math.round(55 * scale);
  const arrowX = width - rightPadding;
  const arrowY = height / 2;
  const arrowOffset = Math.round(6 * scale);
  const arrowHeight = Math.round(8 * scale);
  const strokeWidth = 2.5 * scale;

  return `
  <g class="navigation-arrow" opacity="0.7">
    <circle cx="${arrowX}" cy="${arrowY}" r="${arrowSize / 2}" fill="rgba(255,255,255,0.15)" stroke="${color}" stroke-width="${1.5 * scale}" stroke-opacity="0.3"/>
    <path d="M${arrowX - arrowOffset} ${arrowY - arrowHeight} L${arrowX + arrowOffset} ${arrowY} L${arrowX - arrowOffset} ${arrowY + arrowHeight}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

// ============================================================================
// COVER TEMPLATE RENDERERS
// ============================================================================

// Generate SVG for cover_split_images template (2x2 grid of images)
function generateCoverSplitImagesSVG(
  slideData: SlideData,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const slideImages = customization?.slideImages || [];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;

  const { text } = slideData;
  const textColor = '#FFFFFF';
  const counterColor = 'rgba(255,255,255,0.6)';

  // Grid configuration - 2x2 layout
  const gridPadding = 40;
  const gridGap = 8;
  const gridWidth = width - (gridPadding * 2);
  const gridHeight = height * 0.6; // 60% of height for images
  const cellWidth = (gridWidth - gridGap) / 2;
  const cellHeight = (gridHeight - gridGap) / 2;
  const gridStartY = 80;

  // Generate image grid cells
  const gridCells = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const index = row * 2 + col;
      const x = gridPadding + col * (cellWidth + gridGap);
      const y = gridStartY + row * (cellHeight + gridGap);
      const imageUrl = slideImages[index];

      if (imageUrl) {
        gridCells.push(`
          <clipPath id="cell-${index}">
            <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="8"/>
          </clipPath>
          <image href="${imageUrl}" x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" clip-path="url(#cell-${index})" preserveAspectRatio="xMidYMid slice"/>
        `);
      } else {
        gridCells.push(`
          <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="8" fill="rgba(255,255,255,0.1)"/>
        `);
      }
    }
  }

  // Title at bottom
  const titleFontSize = calculateFontSize(text.length, 'cover', format) * 0.85;
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, titleFontSize);
  const lineHeight = titleFontSize * 1.15;
  const titleStartY = gridStartY + gridHeight + 60;

  const textElements = lines.map((line, index) => {
    const y = titleStartY + (index * lineHeight);
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="700" letter-spacing="-0.02em">${escapeXml(line)}</text>`;
  }).join('\n    ');

  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${counterColor}" font-family="${fontFamily}" font-size="26" font-weight="500">1/${totalSlides}</text>`;
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, true) : '';
  const dotsElement = showDots ? generateNavigationDots(width, height, 1, totalSlides, textColor, format) : '';
  const arrowElement = showArrow ? generateNavigationArrow(width, height, textColor, format) : '';

  const watermark = hasWatermark ? `
    <g class="watermark-cta">
      <rect x="${width / 2 - 100}" y="${height - 85}" width="200" height="36" rx="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${width / 2}" y="${height - 61}" text-anchor="middle" fill="#FFFFFF" font-family="${fontFamily}" font-size="13" font-weight="600" letter-spacing="0.02em">FEITO COM AUDISELL →</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    ${gridCells.filter(c => c.includes('clipPath')).join('\n')}
  </defs>
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${profileIdentity}
  ${counter}
  <g class="image-grid">
    ${gridCells.map(c => c.replace(/<clipPath[^>]*>[\s\S]*?<\/clipPath>/g, '')).join('\n')}
  </g>
  <g class="title">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for cover_gradient_overlay template
function generateCoverGradientOverlaySVG(
  slideData: SlideData,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const slideImage = customization?.slideImages?.[0];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;

  const { text } = slideData;
  const textColor = '#FFFFFF';
  const counterColor = 'rgba(255,255,255,0.6)';

  // Gradient colors from customization or defaults (accent orange to dark)
  const gradientColors = customization?.customGradientColors || ['rgba(255,107,0,0.85)', 'rgba(0,0,0,0.95)'];

  // Background with image + gradient overlay
  let backgroundElement = `<rect width="${width}" height="${height}" fill="${background}"/>`;

  if (slideImage) {
    backgroundElement = `
      <image href="${slideImage}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="0.5"/>
      <defs>
        <linearGradient id="gradientOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${gradientColors[0]}"/>
          <stop offset="100%" stop-color="${gradientColors[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#gradientOverlay)"/>
    `;
  } else {
    backgroundElement = `
      <defs>
        <linearGradient id="gradientOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${gradientColors[0]}"/>
          <stop offset="100%" stop-color="${gradientColors[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#gradientOverlay)"/>
    `;
  }

  // Title centered with text shadow effect
  const titleFontSize = calculateFontSize(text.length, 'cover', format);
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, titleFontSize);
  const lineHeight = titleFontSize * 1.15;
  const totalTitleHeight = lines.length * lineHeight;
  const titleStartY = (height - totalTitleHeight) / 2 + titleFontSize * 0.8;

  const textElements = lines.map((line, index) => {
    const y = titleStartY + (index * lineHeight);
    return `
      <text x="${width / 2}" y="${y + 3}" text-anchor="middle" fill="rgba(0,0,0,0.3)" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(line)}</text>
      <text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(line)}</text>
    `;
  }).join('\n    ');

  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${counterColor}" font-family="${fontFamily}" font-size="26" font-weight="500">1/${totalSlides}</text>`;
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, true) : '';
  const dotsElement = showDots ? generateNavigationDots(width, height, 1, totalSlides, textColor, format) : '';
  const arrowElement = showArrow ? generateNavigationArrow(width, height, textColor, format) : '';

  const watermark = hasWatermark ? `
    <g class="watermark-cta">
      <rect x="${width / 2 - 100}" y="${height - 85}" width="200" height="36" rx="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${width / 2}" y="${height - 61}" text-anchor="middle" fill="#FFFFFF" font-family="${fontFamily}" font-size="13" font-weight="600" letter-spacing="0.02em">FEITO COM AUDISELL →</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${backgroundElement}
  ${profileIdentity}
  ${counter}
  <g class="title">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for COVER slide (slide 1 - HOOK) - cover_full_image (default)
function generateCoverSlideSVG(
  slideData: SlideData,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const slideImage = customization?.slideImages?.[0]; // Cover image
  const hasGradient = customization?.gradientId && customization.gradientId !== 'none';
  const hasImage = !!slideImage;
  const hasDarkBackground = hasImage || hasGradient;

  // Extract slide data
  const { text } = slideData;
  const showDots = customization?.showNavigationDots !== false; // Default true
  const showArrow = customization?.showNavigationArrow !== false; // Default true

  // Cover slide uses white text when there's image/gradient, otherwise based on style
  const textColor = hasDarkBackground ? '#FFFFFF' : (style === 'BLACK_WHITE' ? '#FFFFFF' : '#0A0A0A');
  const counterColor = hasDarkBackground ? 'rgba(255,255,255,0.6)' : (style === 'BLACK_WHITE' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)');

  // Calculate font size for title
  const titleFontSize = calculateFontSize(text.length, 'cover', format);

  // Get text alignment
  const textAlignment = customization?.textAlignment || 'left';
  const alignmentConfig = {
    'left': { x: 80, anchor: 'start' },
    'center': { x: width / 2, anchor: 'middle' },
    'right': { x: width - 80, anchor: 'end' }
  };
  const { x: textX, anchor: textAnchor } = alignmentConfig[textAlignment];

  // Word wrap the title
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, titleFontSize);
  const lineHeight = titleFontSize * 1.15;
  const totalTitleHeight = lines.length * lineHeight;

  let titleStartY: number;

  if (hasImage) {
    // Position at bottom with dots space
    const bottomPadding = showDots ? 100 : 70;
    titleStartY = height - bottomPadding - totalTitleHeight + titleFontSize;
  } else {
    // Center vertically
    titleStartY = (height - totalTitleHeight) / 2 + titleFontSize * 0.8;
  }

  // Generate title text elements (simplified - no highlight)
  const textElements = lines.map((line, index) => {
    const y = titleStartY + (index * lineHeight);
    return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Counter
  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${counterColor}" font-family="${fontFamily}" font-size="26" font-weight="500">1/${totalSlides}</text>`;

  // Background
  let backgroundElement = `<rect width="${width}" height="${height}" fill="${background}"/>`;

  if (slideImage) {
    backgroundElement = generateSlideImageBackground(slideImage, width, height, 1, true);
  } else if (customization?.gradientId && customization.gradientId !== 'none') {
    const gradientBg = generateGradientBackground(
      width,
      height,
      customization.gradientId,
      customization.customGradientColors,
      1
    );
    if (gradientBg) {
      backgroundElement = gradientBg;
    }
  }

  // Navigation dots - SCALED by format
  const dotsElement = showDots ? generateNavigationDots(width, height, 1, totalSlides, textColor, format) : '';

  // Navigation arrow - SCALED by format
  const arrowElement = showArrow ? generateNavigationArrow(width, height, textColor, format) : '';

  // Profile identity for cover slide
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, hasDarkBackground) : '';

  // Watermark with CTA button style
  const watermark = hasWatermark ? `
    <g class="watermark-cta">
      <rect x="${width / 2 - 100}" y="${height - 85}" width="200" height="36" rx="18" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="${width / 2}" y="${height - 61}" text-anchor="middle" fill="#FFFFFF" font-family="${fontFamily}" font-size="13" font-weight="600" letter-spacing="0.02em">FEITO COM AUDISELL →</text>
    </g>
    <g opacity="0.05" transform="rotate(-30 ${width / 2} ${height / 2})">
      <text x="${width / 2}" y="${height / 2 - 60}" text-anchor="middle" fill="#FFFFFF" font-family="${fontFamily}" font-size="64" font-weight="700">DEMO</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${backgroundElement}
  ${profileIdentity}
  ${counter}
  <g class="title">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// ============================================================================
// CONTENT TEMPLATE RENDERERS
// ============================================================================

// Generate SVG for content_image_top template (image at top, text at bottom)
function generateContentImageTopSVG(
  text: string,
  slideNumber: number,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background, text: textColor } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;
  const isLastSlide = slideNumber === totalSlides;

  // Get image for this slide (slideImages array indexed by slide number - 1)
  const slideImage = customization?.slideImages?.[slideNumber - 1];

  // Layout: Image takes top 50%, text takes bottom 50%
  const imageHeight = height * 0.5;
  const textAreaTop = imageHeight + 20;
  const textAreaHeight = height - imageHeight - 100; // Leave space for dots

  // Image area
  let imageElement = '';
  if (slideImage) {
    imageElement = `
      <defs>
        <clipPath id="imageTopClip-${slideNumber}">
          <rect x="40" y="40" width="${width - 80}" height="${imageHeight - 60}" rx="16"/>
        </clipPath>
      </defs>
      <image href="${slideImage}" x="40" y="40" width="${width - 80}" height="${imageHeight - 60}" clip-path="url(#imageTopClip-${slideNumber})" preserveAspectRatio="xMidYMid slice"/>
    `;
  } else {
    imageElement = `
      <rect x="40" y="40" width="${width - 80}" height="${imageHeight - 60}" rx="16" fill="rgba(128,128,128,0.1)" stroke="rgba(128,128,128,0.2)" stroke-width="2" stroke-dasharray="8,4"/>
    `;
  }

  // Text area
  const fontSize = calculateFontSize(text.length, 'content', format) * 0.9;
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, fontSize);
  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = textAreaTop + (textAreaHeight - totalTextHeight) / 2 + fontSize * 0.8;

  const textAlignment = customization?.textAlignment || 'center';
  const alignmentConfig = {
    'left': { x: 80, anchor: 'start' },
    'center': { x: width / 2, anchor: 'middle' },
    'right': { x: width - 80, anchor: 'end' }
  };
  const { x: textX, anchor: textAnchor } = alignmentConfig[textAlignment];

  const textElements = lines.map((line, index) => {
    const y = textStartY + (index * lineHeight);
    return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="500">${escapeXml(line)}</text>`;
  }).join('\n    ');

  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="${fontFamily}" font-size="26" font-weight="500">${slideNumber}/${totalSlides}</text>`;
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, false) : '';
  const dotsElement = showDots ? generateNavigationDots(width, height, slideNumber, totalSlides, textColor, format) : '';
  const arrowElement = showArrow && !isLastSlide ? generateNavigationArrow(width, height, textColor, format) : '';

  const watermark = hasWatermark ? `
    <g opacity="0.12">
      <text x="${width / 2}" y="${height - 35}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">Feito com Audisell</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${imageElement}
  ${counter}
  ${profileIdentity}
  <g class="content">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for content_text_top template (text at top, image at bottom)
function generateContentTextTopSVG(
  text: string,
  slideNumber: number,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background, text: textColor } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;
  const isLastSlide = slideNumber === totalSlides;

  // Get image for this slide
  const slideImage = customization?.slideImages?.[slideNumber - 1];

  // Layout: Text takes top 45%, image takes bottom 55%
  const profileHeight = profile ? 120 : 0;
  const textAreaTop = profileHeight + 40;
  const textAreaHeight = height * 0.4 - profileHeight;
  const imageTop = textAreaTop + textAreaHeight + 20;
  const imageHeight = height - imageTop - 80;

  // Text area
  const fontSize = calculateFontSize(text.length, 'content', format) * 0.9;
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, fontSize);
  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = textAreaTop + (textAreaHeight - totalTextHeight) / 2 + fontSize * 0.8;

  const textAlignment = customization?.textAlignment || 'center';
  const alignmentConfig = {
    'left': { x: 80, anchor: 'start' },
    'center': { x: width / 2, anchor: 'middle' },
    'right': { x: width - 80, anchor: 'end' }
  };
  const { x: textX, anchor: textAnchor } = alignmentConfig[textAlignment];

  const textElements = lines.map((line, index) => {
    const y = textStartY + (index * lineHeight);
    return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="500">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Image area
  let imageElement = '';
  if (slideImage) {
    imageElement = `
      <defs>
        <clipPath id="imageBottomClip-${slideNumber}">
          <rect x="40" y="${imageTop}" width="${width - 80}" height="${imageHeight}" rx="16"/>
        </clipPath>
      </defs>
      <image href="${slideImage}" x="40" y="${imageTop}" width="${width - 80}" height="${imageHeight}" clip-path="url(#imageBottomClip-${slideNumber})" preserveAspectRatio="xMidYMid slice"/>
    `;
  } else {
    imageElement = `
      <rect x="40" y="${imageTop}" width="${width - 80}" height="${imageHeight}" rx="16" fill="rgba(128,128,128,0.1)" stroke="rgba(128,128,128,0.2)" stroke-width="2" stroke-dasharray="8,4"/>
    `;
  }

  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="${fontFamily}" font-size="26" font-weight="500">${slideNumber}/${totalSlides}</text>`;
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, false) : '';
  const dotsElement = showDots ? generateNavigationDots(width, height, slideNumber, totalSlides, textColor, format) : '';
  const arrowElement = showArrow && !isLastSlide ? generateNavigationArrow(width, height, textColor, format) : '';

  const watermark = hasWatermark ? `
    <g opacity="0.12">
      <text x="${width / 2}" y="${height - 35}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">Feito com Audisell</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${counter}
  ${profileIdentity}
  <g class="content">
    ${textElements}
  </g>
  ${imageElement}
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for content_split template (image on one side, text on other)
function generateContentSplitSVG(
  text: string,
  slideNumber: number,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  const { width, height } = DIMENSIONS[format];
  const { background, text: textColor } = STYLES[style];

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;
  const isLastSlide = slideNumber === totalSlides;

  // Get image for this slide
  const slideImage = customization?.slideImages?.[slideNumber - 1];

  // Layout: Alternate image position - even slides have image on right, odd on left
  const imageOnRight = slideNumber % 2 === 0;
  const splitWidth = width * 0.48;
  const padding = 40;
  const contentPadding = 60;

  // Image area
  const imageX = imageOnRight ? width - splitWidth - padding : padding;
  const imageY = padding + 60; // Below counter
  const imageWidth = splitWidth;
  const imageHeight = height - 140 - 80; // Space for counter and dots

  let imageElement = '';
  if (slideImage) {
    imageElement = `
      <defs>
        <clipPath id="imageSplitClip-${slideNumber}">
          <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="16"/>
        </clipPath>
      </defs>
      <image href="${slideImage}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" clip-path="url(#imageSplitClip-${slideNumber})" preserveAspectRatio="xMidYMid slice"/>
    `;
  } else {
    imageElement = `
      <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="16" fill="rgba(128,128,128,0.1)" stroke="rgba(128,128,128,0.2)" stroke-width="2" stroke-dasharray="8,4"/>
    `;
  }

  // Text area
  const textAreaX = imageOnRight ? padding : width - splitWidth - padding;
  const textAreaWidth = splitWidth - contentPadding;

  const fontSize = calculateFontSize(text.length, 'content', format) * 0.85;
  const lines = wrapText(text, textAreaWidth, fontSize);
  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = (height - totalTextHeight) / 2 + fontSize * 0.8;

  const textX = textAreaX + (imageOnRight ? 0 : contentPadding);
  const textAnchor = 'start';

  const textElements = lines.map((line, index) => {
    const y = textStartY + (index * lineHeight);
    return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="500">${escapeXml(line)}</text>`;
  }).join('\n    ');

  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="${fontFamily}" font-size="26" font-weight="500">${slideNumber}/${totalSlides}</text>`;
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, false) : '';
  const dotsElement = showDots ? generateNavigationDots(width, height, slideNumber, totalSlides, textColor, format) : '';
  const arrowElement = showArrow && !isLastSlide ? generateNavigationArrow(width, height, textColor, format) : '';

  const watermark = hasWatermark ? `
    <g opacity="0.12">
      <text x="${width / 2}" y="${height - 35}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">Feito com Audisell</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${imageElement}
  ${counter}
  ${profileIdentity}
  <g class="content">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for CONTENT slides (slides 2+) - content_text_only (default)
// Content slides use SOLID background only - gradients are only for cover
function generateContentSlideSVG(
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

  const fontId = customization?.fontId || 'inter';
  const fontFamily = FONTS[fontId] || FONTS['inter'];
  const showDots = customization?.showNavigationDots !== false;
  const showArrow = customization?.showNavigationArrow !== false;
  const isLastSlide = slideNumber === totalSlides;

  // Content slides use SOLID background only (no gradient)
  const fontSize = calculateFontSize(text.length, 'content', format);
  const maxWidth = width - 160;
  const lines = wrapText(text, maxWidth, fontSize);

  // Get text alignment
  const textAlignment = customization?.textAlignment || 'center';
  const alignmentConfig = {
    'left': { x: 80, anchor: 'start' },
    'center': { x: width / 2, anchor: 'middle' },
    'right': { x: width - 80, anchor: 'end' }
  };
  const { x: textX, anchor: textAnchor } = alignmentConfig[textAlignment];

  // Calculate vertical positioning - center in available space (below profile, above footer)
  const profileHeight = profile ? 150 : 0; // Increased for larger profile (100px avatar + 50px padding)
  const footerHeight = showDots ? 80 : 60;
  const availableHeight = height - profileHeight - footerHeight;
  const lineHeight = fontSize * 1.45;
  const totalTextHeight = lines.length * lineHeight;
  const startY = profileHeight + (availableHeight - totalTextHeight) / 2 + fontSize * 0.8;

  // Generate text elements
  const fontWeight = isSignature ? '700' : '500';
  const textElements = lines.map((line, index) => {
    const y = startY + (index * lineHeight);
    return `<text x="${textX}" y="${y}" text-anchor="${textAnchor}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" letter-spacing="-0.01em">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Counter
  const counter = `<text x="${width - 50}" y="55" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="${fontFamily}" font-size="26" font-weight="500">${slideNumber}/${totalSlides}</text>`;

  // Profile identity - no forced white text for content slides (uses style color)
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily, false) : '';

  // Background - SOLID ONLY for content slides (no gradient)
  const backgroundElement = `<rect width="${width}" height="${height}" fill="${background}"/>`;

  // Navigation dots - SCALED by format
  const dotsElement = showDots ? generateNavigationDots(width, height, slideNumber, totalSlides, textColor, format) : '';

  // Navigation arrow (not on last slide) - SCALED by format
  const arrowElement = showArrow && !isLastSlide ? generateNavigationArrow(width, height, textColor, format) : '';

  // Watermark
  const watermark = hasWatermark ? `
    <g opacity="0.12">
      <text x="${width / 2}" y="${height - 35}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="18" font-weight="600">Feito com Audisell</text>
    </g>
    <g opacity="0.05" transform="rotate(-30 ${width / 2} ${height / 2})">
      <text x="${width / 2}" y="${height / 2 - 60}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}" font-size="64" font-weight="700">DEMO</text>
    </g>` : '';

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
  <g class="content">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Main function to generate slide SVG (routes to cover or content based on template type)
function generateSlideSVG(
  slideData: SlideData,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  isSignature: boolean = false,
  hasWatermark: boolean = true,
  profile?: ProfileIdentity,
  customization?: TemplateCustomization
): string {
  // Slide 1 is always the cover slide - route to appropriate cover template
  if (slideData.number === 1) {
    const coverTemplate = customization?.coverTemplate || 'cover_full_image';

    switch (coverTemplate) {
      case 'cover_split_images':
        return generateCoverSplitImagesSVG(
          slideData,
          totalSlides,
          style,
          format,
          hasWatermark,
          profile,
          customization
        );
      case 'cover_gradient_overlay':
        return generateCoverGradientOverlaySVG(
          slideData,
          totalSlides,
          style,
          format,
          hasWatermark,
          profile,
          customization
        );
      case 'cover_full_image':
      default:
        return generateCoverSlideSVG(
          slideData,
          totalSlides,
          style,
          format,
          hasWatermark,
          profile,
          customization
        );
    }
  }

  // Content slides (2+) - route to appropriate content template
  const contentTemplate = customization?.contentTemplate || 'content_text_only';

  switch (contentTemplate) {
    case 'content_image_top':
      return generateContentImageTopSVG(
        slideData.text,
        slideData.number,
        totalSlides,
        style,
        format,
        hasWatermark,
        profile,
        customization
      );
    case 'content_text_top':
      return generateContentTextTopSVG(
        slideData.text,
        slideData.number,
        totalSlides,
        style,
        format,
        hasWatermark,
        profile,
        customization
      );
    case 'content_split':
      return generateContentSplitSVG(
        slideData.text,
        slideData.number,
        totalSlides,
        style,
        format,
        hasWatermark,
        profile,
        customization
      );
    case 'content_text_only':
    default:
      return generateContentSlideSVG(
        slideData.text,
        slideData.number,
        totalSlides,
        style,
        format,
        isSignature,
        hasWatermark,
        profile,
        customization
      );
  }
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

    // Pre-process images: convert URLs to base64 for SVG embedding
    // This is required because SVG <image> tags with external URLs don't work when rendered
    let processedProfile = profile;
    let processedCustomization = customization;

    // Convert profile photo to base64
    if (profile?.photoUrl) {
      logStep('Converting profile photo to base64...');
      const photoBase64 = await imageUrlToBase64(profile.photoUrl);
      if (photoBase64) {
        processedProfile = { ...profile, photoUrl: photoBase64 };
        logStep('Profile photo converted successfully');
      } else {
        logStep('Failed to convert profile photo, will use initials fallback');
        processedProfile = { ...profile, photoUrl: null };
      }
    }

    // Convert cover/slide images to base64
    if (customization?.slideImages && customization.slideImages.length > 0) {
      logStep('Converting slide images to base64...');
      const processedSlideImages: (string | null)[] = [];

      for (let i = 0; i < customization.slideImages.length; i++) {
        const imageUrl = customization.slideImages[i];
        if (imageUrl) {
          const imageBase64 = await imageUrlToBase64(imageUrl);
          processedSlideImages.push(imageBase64);
          logStep(`Slide image ${i} converted: ${imageBase64 ? 'success' : 'failed'}`);
        } else {
          processedSlideImages.push(null);
        }
      }

      processedCustomization = { ...customization, slideImages: processedSlideImages };
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

      // Create SlideData object
      const slideData: SlideData = {
        number: slideIndex + 1,
        type: slide.type,
        text: slide.text,
        subtitle: slide.subtitle,
        highlightWord: slide.highlightWord
      };

      const svg = generateSlideSVG(
        slideData,
        actualTotalSlides,
        style as keyof typeof STYLES,
        format as keyof typeof DIMENSIONS,
        isSignature,
        hasWatermark,
        processedProfile,
        processedCustomization
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

      // Create SlideData object
      const slideData: SlideData = {
        number: index + 1,
        type: slide.type,
        text: slide.text
      };

      const svg = generateSlideSVG(
        slideData,
        script.slides.length,
        style as keyof typeof STYLES,
        format as keyof typeof DIMENSIONS,
        isSignature,
        hasWatermark,
        processedProfile,
        processedCustomization
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
