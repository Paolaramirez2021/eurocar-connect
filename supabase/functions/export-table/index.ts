import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of allowed tables to export
const ALLOWED_TABLES = [
  'vehicles',
  'reservations', 
  'customers',
  'contracts',
  'maintenance',
  'maintenance_schedules',
  'alerts',
  'alerts_maintenance',
  'finance_items',
  'checklist_templates',
  'checklist_template_items',
  'checklists',
  'checklist_items',
  'pico_placa_payments',
  'devolucion_videos',
  'geofence_zones',
  'time_entries',
  'settings',
  'agents',
  'audit_log',
  'notifications',
  'profiles',
  'user_roles'
];

// Convert value to CSV-safe string
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle objects and arrays - convert to JSON string
  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value);
    // Escape quotes and wrap in quotes
    return `"${jsonStr.replace(/"/g, '""')}"`;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    // If contains comma, newline, or quote, wrap in quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  
  // Handle booleans and numbers
  return String(value);
}

// Convert array of objects to CSV
function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  
  // Get all unique headers from all records
  const headersSet = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => headersSet.add(key));
  });
  const headers = Array.from(headersSet);
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tableName = url.searchParams.get('table');
    const format = url.searchParams.get('format') || 'json'; // 'json' or 'csv'

    console.log(`Export request for table: ${tableName}, format: ${format}`);

    // Validate table name
    if (!tableName) {
      return new Response(
        JSON.stringify({ error: 'Missing table parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!ALLOWED_TABLES.includes(tableName)) {
      return new Response(
        JSON.stringify({ error: `Table '${tableName}' is not allowed for export`, allowed: ALLOWED_TABLES }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all records from the table
    console.log(`Fetching all records from ${tableName}...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully fetched ${data?.length || 0} records from ${tableName}`);

    // Return based on format
    if (format === 'csv') {
      const csvContent = convertToCSV(data || []);
      return new Response(
        csvContent,
        { 
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${tableName}_export.csv"`
          } 
        }
      );
    }

    // Return clean JSON
    return new Response(
      JSON.stringify(data || [], null, 2),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${tableName}_export.json"`
        } 
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
