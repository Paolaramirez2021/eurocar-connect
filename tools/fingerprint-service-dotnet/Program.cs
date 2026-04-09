using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using fingerprint_service_dotnet;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5000");

var app = builder.Build();

// CORS manual - mas confiable que el middleware estandar
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Accept, Origin");
    context.Response.Headers.Append("Access-Control-Max-Age", "86400");

    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }

    await next();
});

// Inicializar servicio de captura una sola vez
var captureService = new FingerprintCaptureService();
bool sdkReady = captureService.Initialize();

// ── ENDPOINTS ──────────────────────────────────────────────

app.MapGet("/", () => Results.Ok(new
{
    service = "EUROCAR - Huella Digital DigitalPersona",
    sdk_loaded = sdkReady,
    version = "2.2.0"
}));

app.MapGet("/estado", () => Results.Ok(new
{
    status = "running",
    sdk_loaded = sdkReady,
    version = "2.2.0"
}));

app.MapPost("/capturar-huella", () =>
{
    try
    {
        if (!sdkReady)
        {
            return Results.Json(
                new { status = "error", error = "SDK de DigitalPersona no disponible. Verifique que dpfpdd.dll este accesible." },
                statusCode: 503);
        }

        // Captura REAL del dispositivo (espera 15 seg a que pongan el dedo)
        string base64Png = captureService.CaptureFingerprint();

        return Results.Ok(new
        {
            status = "success",
            image = base64Png
        });
    }
    catch (Exception ex)
    {
        return Results.Json(
            new { status = "error", error = ex.Message },
            statusCode: 500);
    }
});

Console.WriteLine("============================================================");
Console.WriteLine("  EUROCAR - Huella Digital DigitalPersona 4500");
Console.WriteLine("============================================================");
Console.WriteLine($"  SDK cargado: {(sdkReady ? "SI" : "NO")}");
Console.WriteLine("  CORS: Habilitado (todos los origenes)");
Console.WriteLine("  Servicio en: http://localhost:5000");
Console.WriteLine("  Ctrl+C para detener");
Console.WriteLine("============================================================");

app.Run();
