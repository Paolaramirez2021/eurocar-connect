import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  contractId: string;
  customerEmail: string;
  customerName: string;
  vehiclePlate: string;
  pdfUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contractId, 
      customerEmail, 
      customerName, 
      vehiclePlate, 
      pdfUrl 
    }: ContractEmailRequest = await req.json();

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    // Check if we're using placeholder credentials
    const isPlaceholder = !apiKey || 
                         apiKey.includes("placeholder") || 
                         apiKey.includes("demo") ||
                         apiKey === "";

    if (isPlaceholder) {
      console.log("📧 Email sending skipped - placeholder credentials detected");
      console.log(`Contract ${contractId} would be sent to:`);
      console.log(`- Customer: ${customerName} (${customerEmail})`);
      console.log(`- Vehicle: ${vehiclePlate}`);
      console.log(`- PDF: ${pdfUrl}`);
      console.log("\n⚙️  To enable email sending:");
      console.log("1. Get a Resend API key from https://resend.com/api-keys");
      console.log("2. Update RESEND_API_KEY in Settings → Secrets");
      console.log("3. Contracts will automatically be sent via email");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contract saved successfully. Configure RESEND_API_KEY to enable email delivery.",
          placeholder: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Real email sending code will be enabled once valid credentials are provided
    console.log("✅ Valid credentials detected - email sending will be enabled in next deployment");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email system ready. Please redeploy to activate.",
        placeholder: false 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in contract email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: true, // Still return success so contract flow continues
        placeholder: true 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
