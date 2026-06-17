export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';

export interface FontEntry {
  family: string;
  category: FontCategory;
  weights: number[];
  isVariable: boolean;
}

export const FONT_REGISTRY: FontEntry[] = [
  // Sans-Serif
  { family: 'Inter', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Montserrat', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Outfit', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'DM Sans', category: 'sans-serif', weights: [400, 500, 700], isVariable: false },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Manrope', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Urbanist', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Work Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700], isVariable: true },
  { family: 'Red Hat Display', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Bricolage Grotesque', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900], isVariable: false },
  { family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900], isVariable: false },
  { family: 'Nunito', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Raleway', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Rubik', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Source Sans 3', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Noto Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Ubuntu', category: 'sans-serif', weights: [300, 400, 500, 700], isVariable: false },
  { family: 'Quicksand', category: 'sans-serif', weights: [300, 400, 500, 600, 700], isVariable: true },
  { family: 'Barlow', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Lexend', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Sora', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Archivo', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Karla', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Mukta', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: false },
  { family: 'Cabin', category: 'sans-serif', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'Exo 2', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Titillium Web', category: 'sans-serif', weights: [200, 300, 400, 600, 700, 900], isVariable: false },
  { family: 'Josefin Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700], isVariable: true },
  { family: 'Comfortaa', category: 'sans-serif', weights: [300, 400, 500, 600, 700], isVariable: true },
  { family: 'Overpass', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Prompt', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Sarabun', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800], isVariable: false },
  { family: 'Nanum Gothic', category: 'sans-serif', weights: [400, 700, 800], isVariable: false },
  { family: 'Figtree', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Albert Sans', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Instrument Sans', category: 'sans-serif', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'Wix Madefor Display', category: 'sans-serif', weights: [400, 500, 600, 700, 800], isVariable: true },
  { family: 'Be Vietnam Pro', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Onest', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Geist', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },

  // Serif
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900], isVariable: false },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'PT Serif', category: 'serif', weights: [400, 700], isVariable: false },
  { family: 'Bitter', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Crimson Text', category: 'serif', weights: [400, 600, 700], isVariable: false },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700], isVariable: false },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700, 800], isVariable: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700], isVariable: false },
  { family: 'Spectral', category: 'serif', weights: [200, 300, 400, 500, 600, 700, 800], isVariable: false },
  { family: 'Noto Serif', category: 'serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Cardo', category: 'serif', weights: [400, 700], isVariable: false },
  { family: 'Vollkorn', category: 'serif', weights: [400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Domine', category: 'serif', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'Zilla Slab', category: 'serif', weights: [300, 400, 500, 600, 700], isVariable: false },

  // Display
  { family: 'Bebas Neue', category: 'display', weights: [400], isVariable: false },
  { family: 'Anton', category: 'display', weights: [400], isVariable: false },
  { family: 'Oswald', category: 'display', weights: [200, 300, 400, 500, 600, 700], isVariable: true },
  { family: 'League Spartan', category: 'display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Abril Fatface', category: 'display', weights: [400], isVariable: false },
  { family: 'Alfa Slab One', category: 'display', weights: [400], isVariable: false },
  { family: 'Bungee', category: 'display', weights: [400], isVariable: false },
  { family: 'Fredoka', category: 'display', weights: [300, 400, 500, 600, 700], isVariable: true },
  { family: 'Lilita One', category: 'display', weights: [400], isVariable: false },
  { family: 'Righteous', category: 'display', weights: [400], isVariable: false },
  { family: 'Bangers', category: 'display', weights: [400], isVariable: false },
  { family: 'Permanent Marker', category: 'display', weights: [400], isVariable: false },
  { family: 'Black Ops One', category: 'display', weights: [400], isVariable: false },
  { family: 'Press Start 2P', category: 'display', weights: [400], isVariable: false },
  { family: 'Orbitron', category: 'display', weights: [400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Audiowide', category: 'display', weights: [400], isVariable: false },
  { family: 'Monoton', category: 'display', weights: [400], isVariable: false },
  { family: 'Lobster', category: 'display', weights: [400], isVariable: false },
  { family: 'Lobster Two', category: 'display', weights: [400, 700], isVariable: false },
  { family: 'Passion One', category: 'display', weights: [400, 700, 900], isVariable: false },
  { family: 'Russo One', category: 'display', weights: [400], isVariable: false },
  { family: 'Teko', category: 'display', weights: [300, 400, 500, 600, 700], isVariable: false },
  { family: 'Staatliches', category: 'display', weights: [400], isVariable: false },
  { family: 'Big Shoulders Display', category: 'display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Saira Condensed', category: 'display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Barlow Condensed', category: 'display', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], isVariable: false },
  { family: 'Fjalla One', category: 'display', weights: [400], isVariable: false },
  { family: 'Yanone Kaffeesatz', category: 'display', weights: [200, 300, 400, 500, 600, 700], isVariable: true },
  { family: 'Sigmar One', category: 'display', weights: [400], isVariable: false },
  { family: 'Graduate', category: 'display', weights: [400], isVariable: false },
  { family: 'Bree Serif', category: 'display', weights: [400], isVariable: false },
  { family: 'Pacifico', category: 'display', weights: [400], isVariable: false },

  // Handwriting
  { family: 'Satisfy', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Great Vibes', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700], isVariable: true },
  { family: 'Sacramento', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Kalam', category: 'handwriting', weights: [300, 400, 700], isVariable: false },
  { family: 'Indie Flower', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Amatic SC', category: 'handwriting', weights: [400, 700], isVariable: false },
  { family: 'Shadows Into Light', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Patrick Hand', category: 'handwriting', weights: [400], isVariable: false },
  { family: 'Gloria Hallelujah', category: 'handwriting', weights: [400], isVariable: false },

  // Monospace
  { family: 'Space Mono', category: 'monospace', weights: [400, 700], isVariable: false },
  { family: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800], isVariable: true },
  { family: 'Fira Code', category: 'monospace', weights: [300, 400, 500, 600, 700], isVariable: true },
  { family: 'Source Code Pro', category: 'monospace', weights: [200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'IBM Plex Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700], isVariable: false },
  { family: 'Inconsolata', category: 'monospace', weights: [200, 300, 400, 500, 600, 700, 800, 900], isVariable: true },
  { family: 'Ubuntu Mono', category: 'monospace', weights: [400, 700], isVariable: false },
  { family: 'Overpass Mono', category: 'monospace', weights: [300, 400, 500, 600, 700], isVariable: true },
];

const loadedFonts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

export function isFontLoaded(family: string): boolean {
  return loadedFonts.has(family);
}

export function loadFont(family: string, weights?: number[]): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadedFonts.has(family)) return Promise.resolve();

  const cacheKey = family;
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const entry = getFontEntry(family);
    const wghtsToLoad = weights || (entry ? entry.weights : [400]);

    const formattedName = family.replace(/ /g, '+');
    let url = `https://fonts.googleapis.com/css2?family=${formattedName}`;

    // Handle variable fonts and weight specifications
    if (entry && entry.isVariable) {
      if (wghtsToLoad.length > 1) {
        url += `:wght@${wghtsToLoad[0]}..${wghtsToLoad[wghtsToLoad.length - 1]}`;
      } else {
        url += `:wght@${wghtsToLoad.join(';')}`;
      }
    } else {
      url += `:wght@${wghtsToLoad.join(';')}`;
    }

    url += '&display=swap';

    const link = document.createElement('link');
    link.href = url;
    link.rel = 'stylesheet';
    link.onload = () => {
      loadedFonts.add(family);
      resolve();
    };
    link.onerror = () => {
      console.error(`Failed to load font: ${family}`);
      reject(new Error(`Failed to load font: ${family}`));
    };
    document.head.appendChild(link);
  });

  loadingPromises.set(cacheKey, promise);
  return promise;
}

export function preloadFonts(families: string[]): Promise<void> {
  return Promise.all(families.map(f => loadFont(f))).then(() => {});
}

export function getFontsByCategory(category: FontCategory): FontEntry[] {
  return FONT_REGISTRY.filter(f => f.category === category);
}

export function searchFonts(query: string): FontEntry[] {
  if (!query) return FONT_REGISTRY;
  const q = query.toLowerCase();
  return FONT_REGISTRY.filter(f => f.family.toLowerCase().includes(q));
}

export function getFontEntry(family: string): FontEntry | undefined {
  return FONT_REGISTRY.find(f => f.family === family);
}

// Favorites and Recent Management
const FAVORITES_KEY = 'vidyut-font-favorites';
const RECENT_KEY = 'vidyut-font-recent';
const MAX_RECENT = 10;

function getLocalStorageItems(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const items = localStorage.getItem(key);
    return items ? JSON.parse(items) : [];
  } catch {
    return [];
  }
}

function setLocalStorageItems(key: string, items: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function getFavorites(): string[] {
  return getLocalStorageItems(FAVORITES_KEY);
}

export function toggleFavorite(family: string): string[] {
  const favorites = getFavorites();
  const newFavorites = favorites.includes(family)
    ? favorites.filter(f => f !== family)
    : [...favorites, family];
  setLocalStorageItems(FAVORITES_KEY, newFavorites);
  return newFavorites;
}

export function getRecent(): string[] {
  return getLocalStorageItems(RECENT_KEY);
}

export function addRecent(family: string): string[] {
  let recent = getRecent();
  // Remove if exists to bring to front
  recent = recent.filter(f => f !== family);
  recent.unshift(family);
  if (recent.length > MAX_RECENT) {
    recent = recent.slice(0, MAX_RECENT);
  }
  setLocalStorageItems(RECENT_KEY, recent);
  return recent;
}
