/**
 * Image optimization utility for School Logos and Media Assets.
 * Compresses and scales images down to compact base64 strings (<70KB)
 * so they persist reliably in Cloud Firestore and load instantly.
 */

export async function optimizeImageForStorage(
  source: File | Blob | string,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof source === 'string') {
      srcUrl = source;
    } else {
      srcUrl = URL.createObjectURL(source);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original string if canvas is unsupported
        resolve(typeof source === 'string' ? source : '');
        return;
      }

      // Draw smoothed image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP if supported or JPEG/PNG
      try {
        const outputType = (source instanceof File && source.type === 'image/png') ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputType, quality);
        resolve(compressedDataUrl);
      } catch (err) {
        // Fallback
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onerror = (err) => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }
      console.warn('Image optimization failed to load image, using fallback:', err);
      if (typeof source === 'string') {
        resolve(source);
      } else {
        // If file, read as standard data URL
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(source);
      }
    };

    img.src = srcUrl;
  });
}
