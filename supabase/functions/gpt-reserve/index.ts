import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key and check scopes
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if agent has required scope
    if (!agent.scopes.includes('create_reservations')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { vehicle_id, cliente_nombre, cliente_contacto, cliente_documento, fecha_inicio, fecha_fin, price_total, notas } = await req.json();

    if (!vehicle_id || !cliente_nombre || !cliente_contacto || !fecha_inicio || !fecha_fin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If cliente_documento is provided, check for customer security alert
    if (cliente_documento) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, alerta_cliente, nombres, primer_apellido, cedula_pasaporte, celular, email')
        .ilike('cedula_pasaporte', cliente_documento.trim())
        .single();

      if (customer && customer.alerta_cliente === 'negativo') {
        // Create security alert for admin
        await supabase.from('alerts').insert({
          tipo: 'security_attempt',
          mensaje: `Cliente bloqueado intentó hacer reserva vía API: ${customer.nombres} ${customer.primer_apellido} (${customer.cedula_pasaporte})`,
          recipients_roles: ['administrador', 'socio_principal'],
          priority: 'high',
          meta: {
            customer_id: customer.id,
            customer_name: `${customer.nombres} ${customer.primer_apellido}`,
            cedula: customer.cedula_pasaporte,
            celular: customer.celular,
            email: customer.email,
            vehicle_id: vehicle_id,
            attempted_at: new Date().toISOString(),
            source: 'api',
            agent_name: agent.name
          }
        });

        // Log the security incident
        await supabase.from('audit_log').insert({
          user_id: agent.created_by,
          action_type: 'SECURITY_ALERT_CREATED',
          table_name: 'alerts',
          description: `Intento de reserva bloqueado vía API - Cliente: ${customer.nombres} ${customer.primer_apellido}`,
          new_data: {
            customer_id: customer.id,
            source: 'api',
            agent: agent.name
          }
        });

        return new Response(
          JSON.stringify({ 
            error: 'Cliente bloqueado por alerta de seguridad. No se permite generar reservas.',
            blocked: true,
            customer_name: `${customer.nombres} ${customer.primer_apellido}`
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check availability first
    const { data: available, error: availError } = await supabase.rpc('check_reservation_availability', {
      p_vehicle_id: vehicle_id,
      p_fecha_inicio: fecha_inicio,
      p_fecha_fin: fecha_fin
    });

    if (availError) {
      console.error('Error checking availability:', availError);
      return new Response(
        JSON.stringify({ error: 'Failed to check availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!available) {
      return new Response(
        JSON.stringify({ error: 'Vehicle not available for selected dates' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create reservation with agent as creator
    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        vehicle_id,
        cliente_nombre,
        cliente_contacto,
        fecha_inicio,
        fecha_fin,
        price_total,
        notas,
        source: `API Agent: ${agent.name}`,
        estado: 'pending',
        created_by: agent.created_by // Use the agent creator's ID
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create reservation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reservation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
