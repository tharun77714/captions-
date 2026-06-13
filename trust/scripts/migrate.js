import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Adding export_status to projects table...");
  const { error } = await supabase.rpc('run_sql', {
    query: `
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS export_status TEXT DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS export_url TEXT,
      ADD COLUMN IF NOT EXISTS export_error TEXT;
    `
  });
  
  // Alternatively, just do an update query if rpc doesn't work, but typically you need RPC or direct SQL for DDL.
  if (error) {
    console.log("RPC Error. Fallback to testing if columns exist by selecting...");
    const { error: selectError } = await supabase.from('projects').select('export_status').limit(1);
    if (selectError && selectError.code === 'PGRST204') {
        console.log("Column missing. Please run the SQL manually in Supabase Dashboard:");
        console.log(`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS export_status TEXT DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS export_url TEXT,
        ADD COLUMN IF NOT EXISTS export_error TEXT;
        `);
    } else {
        console.log("Columns appear to exist or other error:", selectError);
    }
  } else {
    console.log("Migration applied.");
  }
}

main();
