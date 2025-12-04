import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for critical maintenance alerts...");

    // Get critical alerts from alerts table
    const { data: criticalAlerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*, vehicles(placa, marca, modelo)')
      .eq('is_resolved', false)
      .eq('priority', 'critical')
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      throw alertsError;
    }

    // Get maintenance alerts that are overdue
    const { data: maintenanceAlerts, error: maintenanceError } = await supabase
      .from('alerts_maintenance_view')
      .select('*')
      .eq('estado', 'activa')
      .lte('dias_restantes', 0);

    if (maintenanceError) {
      console.error("Error fetching maintenance alerts:", maintenanceError);
      throw maintenanceError;
    }

    // Get upcoming scheduled maintenance (within 7 days)
    const { data: upcomingMaintenance, error: scheduleError } = await supabase
      .from('maintenance_schedules')
      .select('*, vehicles(placa, marca, modelo, kilometraje_actual)')
      .eq('is_active', true);

    if (scheduleError) {
      console.error("Error fetching scheduled maintenance:", scheduleError);
      throw scheduleError;
    }

    // Filter for urgent maintenance (within 7 days or 500km)
    const urgentMaintenance = upcomingMaintenance?.filter(schedule => {
      if (schedule.next_due_date) {
        const daysUntil = Math.ceil(
          (new Date(schedule.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7 && daysUntil >= 0) return true;
      }
      if (schedule.next_due_km && schedule.vehicles?.kilometraje_actual) {
        const kmLeft = schedule.next_due_km - schedule.vehicles.kilometraje_actual;
        if (kmLeft <= 500 && kmLeft >= 0) return true;
      }
      return false;
    }) || [];

    const totalAlerts = (criticalAlerts?.length || 0) + (maintenanceAlerts?.length || 0) + urgentMaintenance.length;

    if (totalAlerts === 0) {
      console.log("No critical alerts found.");
      return new Response(
        JSON.stringify({ message: "No critical alerts to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${totalAlerts} critical alerts. Preparing email...`);

    // Get admin email
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@eurocar.com";

    // Build email HTML
    let emailHtml = `
      <h1 style="color: #dc2626;">🚨 Alertas Críticas de Mantenimiento - EUROCAR</h1>
      <p>Se han detectado <strong>${totalAlerts}</strong> alertas críticas que requieren atención inmediata:</p>
    `;

    // Add critical alerts
    if (criticalAlerts && criticalAlerts.length > 0) {
      emailHtml += `
        <h2 style="color: #ea580c; margin-top: 20px;">Alertas Críticas del Sistema</h2>
        <ul style="list-style: none; padding: 0;">
      `;
      criticalAlerts.forEach(alert => {
        emailHtml += `
          <li style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 10px 0;">
            <strong>${alert.tipo}</strong><br>
            <span style="color: #666;">${alert.mensaje}</span><br>
            ${alert.vehicles ? `<small style="color: #999;">Vehículo: ${alert.vehicles.placa} - ${alert.vehicles.marca} ${alert.vehicles.modelo}</small>` : ''}
          </li>
        `;
      });
      emailHtml += `</ul>`;
    }

    // Add maintenance alerts
    if (maintenanceAlerts && maintenanceAlerts.length > 0) {
      emailHtml += `
        <h2 style="color: #ea580c; margin-top: 20px;">Mantenimientos Vencidos</h2>
        <ul style="list-style: none; padding: 0;">
      `;
      maintenanceAlerts.forEach(alert => {
        const daysOverdue = Math.abs(alert.dias_restantes || 0);
        emailHtml += `
          <li style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 10px 0;">
            <strong>${alert.tipo_alerta}</strong><br>
            <span style="color: #666;">${alert.descripcion}</span><br>
            <small style="color: #dc2626;">⚠️ Vencido hace ${daysOverdue} días</small>
          </li>
        `;
      });
      emailHtml += `</ul>`;
    }

    // Add urgent scheduled maintenance
    if (urgentMaintenance.length > 0) {
      emailHtml += `
        <h2 style="color: #ea580c; margin-top: 20px;">Mantenimientos Programados Urgentes</h2>
        <ul style="list-style: none; padding: 0;">
      `;
      urgentMaintenance.forEach(schedule => {
        let urgencyText = '';
        if (schedule.next_due_date) {
          const days = Math.ceil(
            (new Date(schedule.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          urgencyText = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
        }
        if (schedule.next_due_km && schedule.vehicles?.kilometraje_actual) {
          const km = schedule.next_due_km - schedule.vehicles.kilometraje_actual;
          urgencyText += urgencyText ? ` / ${km} km restantes` : `${km} km restantes`;
        }

        emailHtml += `
          <li style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin: 10px 0;">
            <strong>${schedule.tipo}</strong><br>
            <span style="color: #666;">${schedule.vehicles.placa} - ${schedule.vehicles.marca} ${schedule.vehicles.modelo}</span><br>
            <small style="color: #ea580c;">⚠️ ${urgencyText}</small>
          </li>
        `;
      });
      emailHtml += `</ul>`;
    }

    emailHtml += `
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px;">
        Este es un mensaje automático del sistema de gestión de mantenimiento de EUROCAR.<br>
        Por favor, revise el sistema para más detalles y tome las acciones necesarias.
      </p>
    `;

    // Send email
    const emailResult = await resend.emails.send({
      from: "EUROCAR Alerts <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `🚨 ${totalAlerts} Alertas Críticas de Mantenimiento - EUROCAR`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsSent: totalAlerts,
        emailResult
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  } catch (error: any) {
    console.error("Error in send-maintenance-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});