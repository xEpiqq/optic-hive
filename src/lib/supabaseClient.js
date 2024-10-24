import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smoyvtkwjpeqavtrnzpe.supabase.co'
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtb3l2dGt3anBlcWF2dHJuenBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4MDc4MTAsImV4cCI6MjA0MjM4MzgxMH0.kxsFj7c5y2RAZuF4km4zgTXB1Dfjl_aTtTai4ypkFZU"
export const supabase = createClient(supabaseUrl, supabaseKey)