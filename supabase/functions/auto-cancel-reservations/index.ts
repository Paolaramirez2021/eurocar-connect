import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Starting auto-cancellation process...');

    // Find reservations that are pending without payment and past auto_cancel_at
    const { data: expiredReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, vehicle_id, cliente_nombre, auto_cancel_at')
      .eq('estado', 'pending_no_payment')
      .eq('payment_status', 'pending')
      .not('auto_cancel_at', 'is', null)
      .lt('auto_cancel_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired reservations:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredReservations?.length || 0} expired reservations`);

    if (!expiredReservations || expiredReservations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired reservations to cancel',
          cancelled: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel expired reservations
    const reservationIds = expiredReservations.map(r => r.id);
    const { error: cancelError } = await supabase
      .from('reservations')
      .update({
        estado: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelación automática: No se recibió pago en 2 horas'
      })
      .in('id', reservationIds);

    if (cancelError) {
      console.error('Error cancelling reservations:', cancelError);
      throw cancelError;
    }

    // Update vehicle status to disponible for cancelled reservations
    const vehicleIds = expiredReservations.map(r => r.vehicle_id);
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ estado: 'disponible' })
      .in('id', vehicleIds)
      .in('estado', ['reservado', 'alquilado']);

    if (vehicleError) {
      console.error('Error updating vehicle status:', vehicleError);
      // Not throwing here as reservations were already cancelled
    }

    console.log(`Successfully cancelled ${expiredReservations.length} reservations`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cancelled ${expiredReservations.length} expired reservations`,
        cancelled: expiredReservations.length,
        reservations: expiredReservations.map(r => ({
          id: r.id,
          cliente: r.cliente_nombre,
          auto_cancel_at: r.auto_cancel_at
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-cancellation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});