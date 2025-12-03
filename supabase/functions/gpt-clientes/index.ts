import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-gpt-api-key",
};

interface CustomerPayload {
  nombres: string;
  primer_apellido: string;
  segundo_apellido?: string;
  cedula_pasaporte: string;
  email?: string;
  celular: string;
  telefono?: string;
  direccion_residencia?: string;
  pais?: string;
  ciudad?: string;
  fecha_nacimiento?: string;
  estado_civil?: string;
  licencia_numero?: string;
  licencia_ciudad_expedicion?: string;
  licencia_fecha_vencimiento?: string;
  empresa?: string;
  ocupacion?: string;
  direccion_oficina?: string;
  observaciones?: string;
  estado?: string;
  fuente_gpt?: string; // Para identificar qué GPT creó el cliente
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate API Key
    const gptApiKey = req.headers.get("x-gpt-api-key");
    const expectedApiKey = Deno.env.get("GPT_API_KEY");

    if (!gptApiKey || gptApiKey !== expectedApiKey) {
      console.error(`[${requestId}] Unauthorized access attempt`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized. Invalid or missing API key.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const method = req.method;
    const pathname = url.pathname;

    console.log(`[${requestId}] ${method} ${pathname} - Start`);

    // GET /gpt-clientes?correo=email@example.com
    if (method === "GET") {
      const email = url.searchParams.get("correo");
      const cedula = url.searchParams.get("cedula");

      if (!email && !cedula) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Debe proporcionar 'correo' o 'cedula' como parámetro de búsqueda",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      let query = supabase.from("customers").select("*");

      if (email) {
        query = query.eq("email", email);
      } else if (cedula) {
        query = query.eq("cedula_pasaporte", cedula);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Log audit
      await supabase.from("audit_log").insert({
        action_type: "GPT_CUSTOMER_QUERY",
        table_name: "customers",
        record_id: data?.id || null,
        description: `GPT búsqueda por ${email ? "email" : "cédula"}: ${email || cedula}`,
        new_data: { search_param: email || cedula, found: !!data },
      });

      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] GET completed in ${responseTime}ms - Found: ${!!data}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: data || null,
          message: data ? "Cliente encontrado" : "Cliente no encontrado",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // POST /gpt-clientes - Create new customer
    if (method === "POST") {
      const payload: CustomerPayload = await req.json();

      // Validate required fields
      if (!payload.nombres || !payload.primer_apellido || !payload.cedula_pasaporte || !payload.celular) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Campos requeridos: nombres, primer_apellido, cedula_pasaporte, celular",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Check if customer already exists
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("cedula_pasaporte", payload.cedula_pasaporte)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Ya existe un cliente con esta cédula/pasaporte",
            customer_id: existing.id,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Create customer
      const customerData = {
        nombres: payload.nombres,
        primer_apellido: payload.primer_apellido,
        segundo_apellido: payload.segundo_apellido,
        cedula_pasaporte: payload.cedula_pasaporte,
        email: payload.email,
        celular: payload.celular,
        telefono: payload.telefono,
        direccion_residencia: payload.direccion_residencia,
        pais: payload.pais || "Colombia",
        ciudad: payload.ciudad,
        fecha_nacimiento: payload.fecha_nacimiento,
        estado_civil: payload.estado_civil,
        licencia_numero: payload.licencia_numero,
        licencia_ciudad_expedicion: payload.licencia_ciudad_expedicion,
        licencia_fecha_vencimiento: payload.licencia_fecha_vencimiento,
        empresa: payload.empresa,
        ocupacion: payload.ocupacion,
        direccion_oficina: payload.direccion_oficina,
        observaciones: payload.observaciones
          ? `[GPT: ${payload.fuente_gpt || "Desconocido"}] ${payload.observaciones}`
          : `Creado por GPT: ${payload.fuente_gpt || "Desconocido"}`,
        estado: payload.estado || "activo",
      };

      const { data: newCustomer, error: insertError } = await supabase
        .from("customers")
        .insert([customerData])
        .select()
        .single();

      if (insertError) throw insertError;

      // Log audit
      await supabase.from("audit_log").insert({
        action_type: "GPT_CUSTOMER_CREATE",
        table_name: "customers",
        record_id: newCustomer.id,
        new_data: {
          ...customerData,
          gpt_source: payload.fuente_gpt || "Desconocido",
        },
        description: `Cliente creado por GPT: ${payload.fuente_gpt || "Desconocido"}`,
      });

      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] POST completed in ${responseTime}ms - Customer ID: ${newCustomer.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: newCustomer,
          message: "Cliente creado exitosamente",
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // PATCH /gpt-clientes/:id - Update customer
    if (method === "PATCH") {
      const pathParts = pathname.split("/");
      const customerId = pathParts[pathParts.length - 1];

      if (!customerId || customerId === "gpt-clientes") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ID de cliente requerido en la URL",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const payload = await req.json();

      // Get current customer data for audit
      const { data: currentCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (fetchError || !currentCustomer) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Cliente no encontrado",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Update customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", customerId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log audit with before/after data
      await supabase.from("audit_log").insert({
        action_type: "GPT_CUSTOMER_UPDATE",
        table_name: "customers",
        record_id: customerId,
        old_data: currentCustomer,
        new_data: payload,
        description: `Cliente actualizado por GPT: ${payload.fuente_gpt || "Desconocido"}`,
      });

      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] PATCH completed in ${responseTime}ms - Customer ID: ${customerId}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: updatedCustomer,
          message: "Cliente actualizado exitosamente",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({
        success: false,
        error: `Método ${method} no permitido`,
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${responseTime}ms:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error interno del servidor",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
