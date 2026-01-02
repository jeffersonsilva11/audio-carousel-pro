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
  textAlignment?: 'left' | 'center' | 'right';
  // Cover slide specific
  subtitlePosition?: 'above' | 'below'; // Position relative to title
  highlightColor?: string; // Highlight color for keyword
  showNavigationDots?: boolean; // Show navigation dots
  showNavigationArrow?: boolean; // Show navigation arrow indicator
}

interface SlideData {
  number: number;
  type: string;
  text: string;
  subtitle?: string; // Only for HOOK slide
  highlightWord?: string; // Word to highlight in title
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
    return { plan: 'creator', dailyUsed, dailyLimit: 9999, isAdmin: true };
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
function calculateFontSize(
  textLength: number,
  slideType: 'cover' | 'content',
  format: keyof typeof DIMENSIONS
): number {
  const baseSizes: Record<string, { cover: number; content: number }> = {
    POST_SQUARE: { cover: 64, content: 44 },
    POST_PORTRAIT: { cover: 72, content: 48 },
    STORY: { cover: 80, content: 52 }
  };

  const base = baseSizes[format]?.[slideType] || 48;

  // Adjust for text length
  if (textLength > 400) return Math.round(base * 0.65);
  if (textLength > 300) return Math.round(base * 0.75);
  if (textLength > 200) return Math.round(base * 0.85);
  if (textLength > 100) return Math.round(base * 0.95);
  if (textLength < 50) return Math.round(base * 1.15);

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

// Generate navigation dots SVG
function generateNavigationDots(
  width: number,
  height: number,
  currentSlide: number,
  totalSlides: number,
  color: string = '#FFFFFF'
): string {
  const dotSize = 8;
  const dotGap = 12;
  const totalWidth = totalSlides * dotSize + (totalSlides - 1) * dotGap;
  const startX = (width - totalWidth) / 2;
  const y = height - 45;

  const dots = Array.from({ length: totalSlides }, (_, i) => {
    const x = startX + i * (dotSize + dotGap) + dotSize / 2;
    const opacity = i === currentSlide - 1 ? '1' : '0.4';
    const size = i === currentSlide - 1 ? dotSize : dotSize * 0.75;
    return `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${color}" opacity="${opacity}"/>`;
  }).join('\n    ');

  return `<g class="navigation-dots">${dots}</g>`;
}

// Generate navigation arrow indicator SVG
function generateNavigationArrow(
  width: number,
  height: number,
  color: string = '#FFFFFF'
): string {
  const arrowX = width - 55;
  const arrowY = height / 2;
  const arrowSize = 40;

  return `
  <g class="navigation-arrow" opacity="0.7">
    <circle cx="${arrowX}" cy="${arrowY}" r="${arrowSize / 2}" fill="rgba(255,255,255,0.15)" stroke="${color}" stroke-width="1.5" stroke-opacity="0.3"/>
    <path d="M${arrowX - 6} ${arrowY - 8} L${arrowX + 6} ${arrowY} L${arrowX - 6} ${arrowY + 8}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

// Apply highlight to a word in text (returns SVG with background rect)
function applyHighlightToWord(
  line: string,
  highlightWord: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  textAnchor: string,
  highlightColor: string = '#F97316'
): string {
  if (!highlightWord || !line.toLowerCase().includes(highlightWord.toLowerCase())) {
    return `<text x="${x}" y="${y}" text-anchor="${textAnchor}" fill="#FFFFFF" font-family="${fontFamily}" font-size="${fontSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(line)}</text>`;
  }

  // Find the word position
  const regex = new RegExp(`(${highlightWord})`, 'gi');
  const parts = line.split(regex);

  // For simplicity, wrap the entire line if it contains the highlight word
  // Calculate approximate text width
  const avgCharWidth = fontSize * 0.55;
  const padding = 12;
  const wordWidth = highlightWord.length * avgCharWidth + padding * 2;
  const wordHeight = fontSize * 1.2;

  // Find word position in line
  const beforeWord = line.substring(0, line.toLowerCase().indexOf(highlightWord.toLowerCase()));
  const beforeWidth = beforeWord.length * avgCharWidth;

  let rectX: number;
  if (textAnchor === 'start') {
    rectX = x + beforeWidth - padding;
  } else if (textAnchor === 'middle') {
    const totalWidth = line.length * avgCharWidth;
    rectX = x - totalWidth / 2 + beforeWidth - padding;
  } else {
    const totalWidth = line.length * avgCharWidth;
    rectX = x - totalWidth + beforeWidth - padding;
  }

  return `
    <g class="highlight-group">
      <rect x="${rectX}" y="${y - fontSize * 0.85}" width="${wordWidth}" height="${wordHeight}" rx="4" fill="${highlightColor}"/>
      <text x="${x}" y="${y}" text-anchor="${textAnchor}" fill="#FFFFFF" font-family="${fontFamily}" font-size="${fontSize}" font-weight="800" letter-spacing="-0.02em">${escapeXml(line)}</text>
    </g>`;
}

// Generate SVG for COVER slide (slide 1 - HOOK)
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
  const hasImage = !!slideImage;

  // Extract slide data
  const { text, subtitle, highlightWord } = slideData;
  const subtitlePosition = customization?.subtitlePosition || 'above';
  const highlightColor = customization?.highlightColor || '#F97316';
  const showDots = customization?.showNavigationDots !== false; // Default true
  const showArrow = customization?.showNavigationArrow !== false; // Default true

  // Cover slide uses white text when there's image, otherwise based on style
  const textColor = hasImage ? '#FFFFFF' : (style === 'BLACK_WHITE' ? '#FFFFFF' : '#0A0A0A');
  const counterColor = hasImage ? 'rgba(255,255,255,0.6)' : (style === 'BLACK_WHITE' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)');

  // Calculate font sizes
  const titleFontSize = calculateFontSize(text.length, 'cover', format);
  const subtitleFontSize = Math.round(titleFontSize * 0.38); // Smaller subtitle

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

  // Calculate vertical positioning
  const subtitleHeight = subtitle ? subtitleFontSize * 1.5 : 0;
  const subtitleGap = subtitle ? 20 : 0;
  const totalContentHeight = totalTitleHeight + subtitleHeight + subtitleGap;

  let titleStartY: number;
  let subtitleY: number;

  if (hasImage) {
    // Position at bottom with dots space
    const bottomPadding = showDots ? 100 : 70;
    titleStartY = height - bottomPadding - totalTitleHeight + titleFontSize;

    if (subtitle) {
      if (subtitlePosition === 'above') {
        subtitleY = titleStartY - subtitleGap - subtitleFontSize * 0.3;
        // Adjust title down slightly if subtitle above
      } else {
        subtitleY = titleStartY + totalTitleHeight + subtitleGap;
        titleStartY -= subtitleHeight + subtitleGap;
      }
    }
  } else {
    // Center vertically
    titleStartY = (height - totalContentHeight) / 2 + titleFontSize * 0.8;

    if (subtitle) {
      if (subtitlePosition === 'above') {
        subtitleY = titleStartY - subtitleGap;
        titleStartY += subtitleHeight;
      } else {
        subtitleY = titleStartY + totalTitleHeight + subtitleGap;
      }
    }
  }

  // Generate subtitle element
  const subtitleElement = subtitle ? `
    <text x="${textX}" y="${subtitleY}" text-anchor="${textAnchor}" fill="${textColor}" opacity="0.85" font-family="${fontFamily}" font-size="${subtitleFontSize}" font-weight="500" letter-spacing="0.05em" text-transform="uppercase">${escapeXml(subtitle.toUpperCase())}</text>
  ` : '';

  // Generate title text elements with optional highlight
  const textElements = lines.map((line, index) => {
    const y = titleStartY + (index * lineHeight);
    if (highlightWord && line.toLowerCase().includes(highlightWord.toLowerCase())) {
      return applyHighlightToWord(line, highlightWord, textX, y, titleFontSize, fontFamily, textAnchor, highlightColor);
    }
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

  // Navigation dots
  const dotsElement = showDots ? generateNavigationDots(width, height, 1, totalSlides, textColor) : '';

  // Navigation arrow
  const arrowElement = showArrow ? generateNavigationArrow(width, height, textColor) : '';

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
  ${counter}
  ${subtitleElement}
  <g class="title">
    ${textElements}
  </g>
  ${dotsElement}
  ${arrowElement}
  ${watermark}
</svg>`;
}

// Generate SVG for CONTENT slides (slides 2+)
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

  // Content slides don't use individual images, only gradient or solid
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
  const profileHeight = profile ? 100 : 0;
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

  // Profile identity
  const profileIdentity = profile ? generateProfileIdentitySVG(profile, style, format, fontFamily) : '';

  // Background
  let backgroundElement = `<rect width="${width}" height="${height}" fill="${background}"/>`;

  if (customization?.gradientId && customization.gradientId !== 'none') {
    const gradientBg = generateGradientBackground(
      width,
      height,
      customization.gradientId,
      customization.customGradientColors,
      slideNumber
    );
    if (gradientBg) {
      backgroundElement = gradientBg;
    }
  }

  // Navigation dots
  const dotsElement = showDots ? generateNavigationDots(width, height, slideNumber, totalSlides, textColor) : '';

  // Navigation arrow (not on last slide)
  const arrowElement = showArrow && !isLastSlide ? generateNavigationArrow(width, height, textColor) : '';

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

// Main function to generate slide SVG (routes to cover or content)
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
  // Slide 1 is always the cover slide with special layout
  if (slideData.number === 1) {
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

  // All other slides use content layout
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

      // Create SlideData object with all fields
      const slideData: SlideData = {
        number: index + 1,
        type: slide.type,
        text: slide.text,
        subtitle: slide.subtitle,
        highlightWord: slide.highlightWord
      };

      const svg = generateSlideSVG(
        slideData,
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
