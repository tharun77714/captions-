/**
 * Database utility helpers for Supabase error classification, deduplication, and safe logging.
 */

export interface SupabaseLikeError {
  code?: string;
  message?: string;
  details?: string;
}

export interface BaseExportItem {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  status: string;
  downloadUrl: string | null;
  source: 'exports_table' | 'projects_fallback';
}

/**
 * Strictly checks if a Supabase query error is due to a missing `exports` table.
 * Requires PostgreSQL 42P01 or PostgREST PGRST205 to explicitly reference the table 'exports'.
 */
export function isMissingExportsTableError(error: SupabaseLikeError | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();

  // Reject PGRST204 (missing column error) explicitly
  if (code === 'PGRST204') return false;

  // Postgres 42P01 (undefined_table) strictly requires reference to table exports
  if (code === '42P01') {
    return (
      message.includes('exports') ||
      details.includes('exports') ||
      message.includes('public.exports')
    );
  }

  // PostgREST PGRST205 strictly requires reference to exports table
  if (code === 'PGRST205') {
    return message.includes('exports') || details.includes('exports');
  }

  // Direct string check for relation public.exports does not exist
  if (message.includes('relation "public.exports" does not exist') || message.includes('relation "exports" does not exist')) {
    return true;
  }

  return false;
}

/**
 * Deduplicates export records from public.exports table and public.projects fallback.
 * Uses `project_id` from exports table rows to filter out redundant project fallback rows.
 */
export function mergeExportsAndProjects(
  exportsItems: BaseExportItem[],
  projectItems: BaseExportItem[]
): BaseExportItem[] {
  if (!exportsItems || exportsItems.length === 0) return projectItems || [];
  if (!projectItems || projectItems.length === 0) return exportsItems;

  const existingProjectIds = new Set(
    exportsItems.map((item) => item.projectId).filter(Boolean)
  );

  const uniqueProjectFallbackItems = projectItems.filter(
    (proj) => !existingProjectIds.has(proj.projectId)
  );

  return [...exportsItems, ...uniqueProjectFallbackItems];
}
