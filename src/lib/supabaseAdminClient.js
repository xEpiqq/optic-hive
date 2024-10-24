import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://smoyvtkwjpeqavtrnzpe.supabase.co'
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjgwNzgxMCwiZXhwIjoyMDQyMzgzODEwfQ._eVwl6mcyU4C_rTDF8TJ_3sHnPGkfBJkM5W0meR0qsU'

export const supabaseAdmin = createClient(
    supabaseUrl, 
    supabaseServiceRoleKey
);