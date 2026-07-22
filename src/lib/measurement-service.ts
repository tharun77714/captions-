export interface MeasurementKey {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  fontFeatures?: string;
  stroke?: string;
  shadow?: string;
}

export function getMeasurementKey(key: MeasurementKey): string {
  const styleHash = `${key.fontFamily}-${key.fontWeight}-${key.fontSize}-${key.letterSpacing}-${key.fontFeatures || ''}-${key.stroke || ''}-${key.shadow || ''}`;
  return `${styleHash}|${key.text}`;
}

class MeasurementService {
  private cache = new Map<string, number>();
  private container: HTMLSpanElement | null = null;

  /**
   * Synchronously measures the width of a text string using the browser's native DOM layout engine.
   * Caches results by text and style properties to eliminate layout thrashing.
   */
  measureWidth(key: MeasurementKey): number {
    // SSR Safe fallback
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;

    const cacheKey = getMeasurementKey(key);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Lazy initialize the hidden measurement container
    if (!this.container) {
      this.container = document.createElement('span');
      this.container.style.position = 'absolute';
      this.container.style.visibility = 'hidden';
      this.container.style.whiteSpace = 'pre'; // Do not wrap
      this.container.style.top = '-9999px';
      this.container.style.left = '-9999px';
      this.container.style.padding = '0';
      this.container.style.margin = '0';
      this.container.style.border = 'none';
      document.body.appendChild(this.container);
    }

    // Apply exact typography styles
    this.container.style.fontFamily = `"${key.fontFamily}", "Noto Sans Telugu", "Noto Sans Arabic", "Noto Sans JP", sans-serif`;
    this.container.style.fontSize = `${key.fontSize}px`;
    this.container.style.fontWeight = key.fontWeight.toString();
    this.container.style.letterSpacing = `${key.letterSpacing}px`;
    
    // Set text
    this.container.textContent = key.text;

    // Measure exact sub-pixel width
    const width = this.container.getBoundingClientRect().width;
    
    this.cache.set(cacheKey, width);
    return width;
  }

  /**
   * Clear cache if absolutely necessary (e.g., massive memory pressure)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export a singleton instance
export const measurementService = new MeasurementService();
