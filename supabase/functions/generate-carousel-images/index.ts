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

// Generate SVG for each slide
function generateSlideSVG(
  text: string,
  slideNumber: number,
  totalSlides: number,
  style: keyof typeof STYLES,
  format: keyof typeof DIMENSIONS,
  isSignature: boolean = false,
  hasWatermark: boolean = true
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
    return `<text x="${width / 2}" y="${y}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="${isSignature ? '700' : '500'}">${escapeXml(line)}</text>`;
  }).join('\n    ');

  // Slide counter
  const counter = `<text x="${width - 60}" y="60" text-anchor="end" fill="${textColor}" opacity="0.5" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="500">${slideNumber}/${totalSlides}</text>`;

  // Watermark for free users
  const watermark = hasWatermark ? `
    <g opacity="0.15">
      <text x="${width / 2}" y="${height - 40}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="600">CarrosselAI</text>
    </g>
    <g opacity="0.08" transform="rotate(-30 ${width / 2} ${height / 2})">
      <text x="${width / 2}" y="${height / 2 - 100}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="80" font-weight="700">DEMO</text>
      <text x="${width / 2}" y="${height / 2 + 50}" text-anchor="middle" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="40" font-weight="500">carrosselai.com</text>
    </g>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${counter}
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

  try {
    const { script, style, format, carouselId, userId, hasWatermark = true } = await req.json();

    if (!script || !script.slides) {
      throw new Error('No script provided');
    }

    console.log(`Generating ${script.slides.length} slide images (watermark: ${hasWatermark})...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        hasWatermark
      );

      // Convert to base64
      const base64 = svgToBase64(svg);
      const svgBuffer = new TextEncoder().encode(svg);

      // Upload to storage
      const fileName = `${userId}/${carouselId}/slide-${index + 1}.svg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
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
        console.error('Update error:', updateError);
      }
    }

    const slides = script.slides.map((slide: { type: string; text: string }, index: number) => ({
      number: index + 1,
      type: slide.type,
      text: slide.text,
      imageUrl: imageUrls[index]
    }));

    console.log('Generated and uploaded', slides.length, 'slide images');

    return new Response(JSON.stringify({ slides, imageUrls }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-carousel-images function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
