/**
 * Image format converter utility
 * Converts SVG images to PNG or JPG format using Canvas API
 */

export type ExportFormat = 'svg' | 'png' | 'jpg';

interface ConversionOptions {
  format: ExportFormat;
  quality?: number; // 0-1 for JPG quality
  scale?: number; // Scale factor for higher resolution
}

/**
 * Convert an SVG URL to the specified format
 * @param svgUrl - URL of the SVG image
 * @param options - Conversion options (format, quality, scale)
 * @returns Promise<Blob> - The converted image as a Blob
 */
export async function convertSvgToFormat(
  svgUrl: string,
  options: ConversionOptions
): Promise<Blob> {
  const { format, quality = 0.92, scale = 2 } = options;

  // If SVG format, just fetch and return the original
  if (format === 'svg') {
    const response = await fetch(svgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }

  // Fetch the SVG content
  const response = await fetch(svgUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
  }
  const svgText = await response.text();

  // Parse SVG to get dimensions
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;

  // Get dimensions from viewBox or width/height attributes
  let width = 1080;
  let height = 1080;

  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+|,/).map(Number);
    if (parts.length >= 4) {
      width = parts[2];
      height = parts[3];
    }
  } else {
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');
    if (widthAttr) width = parseInt(widthAttr, 10) || 1080;
    if (heightAttr) height = parseInt(heightAttr, 10) || 1080;
  }

  // Create canvas with scaled dimensions for higher quality
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  // For JPG, fill with white background (no transparency)
  if (format === 'jpg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Create an image from the SVG
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Scale the context
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to the desired format
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        mimeType,
        format === 'jpg' ? quality : undefined
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };

    // Convert SVG to data URL for cross-origin loading
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;

    // Clean up the URL after loading
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        mimeType,
        format === 'jpg' ? quality : undefined
      );
    };
  });
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  return format;
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    default:
      return 'image/png';
  }
}
