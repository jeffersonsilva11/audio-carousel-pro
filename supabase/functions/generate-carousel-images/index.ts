import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  isSignature: boolean = false
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${counter}
  <g>
    ${textElements}
  </g>
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
    const { script, style, format } = await req.json();

    if (!script || !script.slides) {
      throw new Error('No script provided');
    }

    console.log(`Generating ${script.slides.length} slide images...`);

    const slides = script.slides.map((slide: any, index: number) => {
      const isSignature = slide.type === 'SIGNATURE';
      const svg = generateSlideSVG(
        slide.text,
        index + 1,
        script.slides.length,
        style as keyof typeof STYLES,
        format as keyof typeof DIMENSIONS,
        isSignature
      );

      // Convert SVG to base64 data URL
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;

      return {
        number: index + 1,
        type: slide.type,
        text: slide.text,
        imageUrl: dataUrl
      };
    });

    console.log('Generated', slides.length, 'slide images');

    return new Response(JSON.stringify({ slides }), {
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
