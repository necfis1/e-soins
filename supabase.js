import { createClient } from '@supabase/supabase-js';

// ⚠️  REMPLACEZ CES DEUX VALEURS par celles de votre projet Supabase
// (Project Settings → API dans votre tableau de bord Supabase)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'VOTRE_SUPABASE_URL';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'VOTRE_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
