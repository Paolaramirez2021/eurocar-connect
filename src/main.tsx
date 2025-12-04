import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Diagnóstico temporal
console.log('=== DIAGNÓSTICO SUPABASE ===');
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key disponible:', !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
console.log('Key length:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.length || 0);
console.log('=========================');

createRoot(document.getElementById("root")!).render(<App />);
