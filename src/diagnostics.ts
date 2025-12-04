// Script de diagnóstico para verificar configuración de Supabase
console.log('=== DIAGNÓSTICO SUPABASE ===');
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key length:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.length || 0);
console.log('Key primeros 20 chars:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 20));
console.log('Project ID:', import.meta.env.VITE_SUPABASE_PROJECT_ID);
console.log('=========================');
