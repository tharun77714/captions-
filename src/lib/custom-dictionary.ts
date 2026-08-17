/**
 * Per-user Custom Dictionary Utility
 * Stores custom word corrections (e.g. brand names, creator names, English loanwords in Indian language sentences)
 * namespaced by authenticated user ID in localStorage: `vidyut:dictionary:<user-id>`.
 */

export interface DictionaryRule {
  id: string;
  search: string;
  replaceWith: string;
  createdAt: string;
}

const memoryStorage = new Map<string, string>();

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) || null;
    }
  }
  return memoryStorage.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      memoryStorage.set(key, value);
      return;
    }
  }
  memoryStorage.set(key, value);
}

function getStorageKey(userId: string): string {
  return `vidyut:dictionary:${userId}`;
}

export function clearMemoryStorage(): void {
  memoryStorage.clear();
}

/**
 * Normalizes text to Unicode NFC form and trims whitespace.
 */
export function normalizeUnicodeText(text: string): string {
  if (!text) return '';
  return text.trim().normalize('NFC');
}

/**
 * Safely parse rules array from localStorage, filtering out malformed entries.
 */
export function getDictionaryRules(userId: string): DictionaryRule[] {
  if (!userId) return [];
  try {
    const raw = getStorageItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is DictionaryRule =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.search === 'string' &&
        typeof item.replaceWith === 'string'
    );
  } catch (error) {
    console.error('Failed to read custom dictionary from storage:', error);
    return [];
  }
}

export function saveDictionaryRule(
  userId: string,
  search: string,
  replaceWith: string
): { success: boolean; rule?: DictionaryRule; error?: string } {
  if (!userId) return { success: false, error: 'Authentication required. User ID missing.' };
  
  const cleanSearch = normalizeUnicodeText(search);
  const cleanReplace = normalizeUnicodeText(replaceWith);
  
  if (!cleanSearch) return { success: false, error: 'Search text cannot be empty' };
  if (cleanSearch.length > 100 || cleanReplace.length > 100) {
    return { success: false, error: 'Rule text cannot exceed 100 characters' };
  }

  const existing = getDictionaryRules(userId);
  const isDuplicate = existing.some(
    (r) => normalizeUnicodeText(r.search).toLowerCase() === cleanSearch.toLowerCase()
  );
  if (isDuplicate) {
    return { success: false, error: `Rule for "${cleanSearch}" already exists` };
  }

  const newRule: DictionaryRule = {
    id: `dict-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    search: cleanSearch,
    replaceWith: cleanReplace,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRule, ...existing];
  try {
    setStorageItem(getStorageKey(userId), JSON.stringify(updated));
    return { success: true, rule: newRule };
  } catch (error) {
    console.error('Failed to save custom dictionary rule:', error);
    return { success: false, error: 'Failed to write rule to local storage' };
  }
}

export function updateDictionaryRule(
  userId: string,
  ruleId: string,
  search: string,
  replaceWith: string
): { success: boolean; error?: string } {
  if (!userId) return { success: false, error: 'Authentication required. User ID missing.' };
  
  const cleanSearch = normalizeUnicodeText(search);
  const cleanReplace = normalizeUnicodeText(replaceWith);
  if (!cleanSearch) return { success: false, error: 'Search text cannot be empty' };
  if (cleanSearch.length > 100 || cleanReplace.length > 100) {
    return { success: false, error: 'Rule text cannot exceed 100 characters' };
  }

  const existing = getDictionaryRules(userId);
  const index = existing.findIndex((r) => r.id === ruleId);
  if (index === -1) return { success: false, error: 'Rule not found' };

  // Check duplicate search term excluding current rule
  const isDuplicate = existing.some(
    (r) => r.id !== ruleId && normalizeUnicodeText(r.search).toLowerCase() === cleanSearch.toLowerCase()
  );
  if (isDuplicate) {
    return { success: false, error: `Another rule for "${cleanSearch}" already exists` };
  }

  existing[index] = {
    ...existing[index],
    search: cleanSearch,
    replaceWith: cleanReplace,
  };

  try {
    setStorageItem(getStorageKey(userId), JSON.stringify(existing));
    return { success: true };
  } catch (error) {
    console.error('Failed to update dictionary rule:', error);
    return { success: false, error: 'Failed to update local storage' };
  }
}

export function deleteDictionaryRule(userId: string, ruleId: string): boolean {
  if (!userId) return false;
  const existing = getDictionaryRules(userId);
  const filtered = existing.filter((r) => r.id !== ruleId);
  try {
    setStorageItem(getStorageKey(userId), JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete dictionary rule:', error);
    return false;
  }
}
