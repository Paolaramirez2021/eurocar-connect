namespace EurocarFingerprint;

var builder = WebApplication.CreateBuilder(args);

// Configurar puerto 5000
builder.WebHost.UseUrls("http://0.0.0.0:5000");

// Registrar servicio de captura como singleton
builder.Services.AddSingleton<FingerprintCaptureService>();

var app = builder.Build();

// CORS manual - MAS confiable que el middleware estandar para servicios locales
// Agrega headers a TODAS las respuestas incluyendo preflight OPTIONS
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    context.Response.Headers.Append("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type, Accept, Origin");
    context.Response.Headers.Append("Access-Control-Max-Age", "86400");

    // Responder preflight OPTIONS inmediatamente
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 204;
        return;
    }

    await next();
});

// Inicializar SDK al arrancar
var captureService = app.Services.GetRequiredService<FingerprintCaptureService>();
bool sdkReady = captureService.Initialize();

// ── Endpoints ───────────────────────────────────────────────────────

app.MapGet("/", () => Results.Json(new
{
    service = "EUROCAR - Servicio de Huella Digital (.NET)",
    sdk_loaded = sdkReady,
    endpoints = new
    {
        capturar_huella = "POST /capturar-huella",
        estado = "GET /estado"
    }
}));

app.MapGet("/estado", () => Results.Json(new
{
    status = "running",
    sdk_loaded = sdkReady,
    version = "2.1.0"
}));

app.MapPost("/capturar-huella", (FingerprintCaptureService svc, ILogger<Program> logger) =>
{
    try
    {
        if (!sdkReady)
            return Results.Json(
                new { status = "error", error = "SDK de DigitalPersona no disponible. Verifique la instalacion." },
                statusCode: 503);

        byte[] pngBytes = svc.CaptureFingerprint(timeoutMs: 15000);
        string base64 = Convert.ToBase64String(pngBytes);

        logger.LogInformation("Huella capturada exitosamente: {Size} bytes PNG", pngBytes.Length);

        return Results.Json(new
        {
            status = "success",
            image = base64
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error capturando huella");
        return Results.Json(
            new { status = "error", error = ex.Message },
            statusCode: 500);
    }
});

// ── Arrancar ────────────────────────────────────────────────────────

Console.WriteLine("============================================================");
Console.WriteLine("  EUROCAR - Servicio de Huella Digital DigitalPersona (.NET)");
Console.WriteLine("============================================================");
Console.WriteLine($"  SDK cargado: {(sdkReady ? "SI" : "NO")}");
Console.WriteLine("  CORS: Habilitado para todos los origenes");
Console.WriteLine("  Servicio en: http://localhost:5000");
Console.WriteLine("  Ctrl+C para detener");
Console.WriteLine("============================================================");

app.Run();
