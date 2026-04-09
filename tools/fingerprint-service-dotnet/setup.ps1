# cd C:\Users\Paola\Downloads\fingerprint-service-dotnet
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\setup.ps1

Write-Host "Generando archivos..." -ForegroundColor Green

# 1. CSPROJ - con DPFPDevNET + System.Drawing.Common
@'
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="DPFPDevNET">
      <HintPath>C:\Program Files\DigitalPersona\U.are.U SDK\Windows\Lib\.NET\DPFPDevNET.dll</HintPath>
    </Reference>
    <PackageReference Include="System.Drawing.Common" Version="8.0.0" />
  </ItemGroup>
</Project>
'@ | Set-Content -Path "EurocarFingerprint.csproj" -Encoding UTF8

# 2. PROGRAM.CS
@'
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5000");
var app = builder.Build();

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

app.MapGet("/", () => Results.Ok(new { service = "EUROCAR Huella Digital", version = "3.0" }));

app.MapGet("/estado", () => Results.Ok(new { status = "running", version = "3.0" }));

app.MapPost("/capturar-huella", () =>
{
    try
    {
        var service = new FingerprintCaptureService();
        string base64 = service.CaptureFingerprint();
        Console.WriteLine("[OK] Huella capturada");
        return Results.Ok(new { status = "success", image = base64 });
    }
    catch (Exception ex)
    {
        Console.WriteLine("[ERROR] " + ex.Message);
        return Results.Json(new { status = "error", error = ex.Message }, statusCode: 500);
    }
});

Console.WriteLine("=========================================");
Console.WriteLine("  EUROCAR Huella Digital v3.0");
Console.WriteLine("  http://localhost:5000");
Console.WriteLine("=========================================");
app.Run();
'@ | Set-Content -Path "Program.cs" -Encoding UTF8

# 3. FINGERPRINT CAPTURE SERVICE
@'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Threading;
using DPFP;
using DPFP.Capture;

public class FingerprintCaptureService
{
    public string CaptureFingerprint(int timeoutMs = 15000)
    {
        using var capturer = new Capture();
        var handler = new CaptureEventHandler();
        capturer.EventHandler = handler;

        Console.WriteLine("[HUELLA] Iniciando captura... Coloque el dedo.");
        capturer.StartCapture();

        bool captured = handler.WaitForCapture(timeoutMs);
        capturer.StopCapture();

        if (!captured || handler.CapturedSample == null)
            throw new Exception("Tiempo agotado. Coloque el dedo en el sensor e intente de nuevo.");

        Console.WriteLine("[HUELLA] Dedo detectado, procesando imagen...");

        Bitmap? bitmap = null;
        new SampleConversion().ConvertToPicture(handler.CapturedSample, ref bitmap);

        if (bitmap == null)
            throw new Exception("No se pudo convertir la huella a imagen.");

        using var ms = new MemoryStream();
        bitmap.Save(ms, ImageFormat.Png);
        bitmap.Dispose();

        return Convert.ToBase64String(ms.ToArray());
    }
}

public class CaptureEventHandler : DPFP.Capture.EventHandler
{
    private readonly ManualResetEventSlim _captureEvent = new(false);
    public Sample? CapturedSample { get; private set; }

    public bool WaitForCapture(int timeoutMs)
    {
        return _captureEvent.Wait(timeoutMs);
    }

    public void OnComplete(object capture, string readerSerialNumber, Sample sample)
    {
        Console.WriteLine("[HUELLA] Captura completa!");
        CapturedSample = sample;
        _captureEvent.Set();
    }

    public void OnFingerGone(object capture, string readerSerialNumber)
    {
        Console.WriteLine("[HUELLA] Dedo retirado");
    }

    public void OnFingerTouched(object capture, string readerSerialNumber)
    {
        Console.WriteLine("[HUELLA] Dedo detectado...");
    }

    public void OnReaderConnect(object capture, string readerSerialNumber)
    {
        Console.WriteLine("[HUELLA] Lector conectado");
    }

    public void OnReaderDisconnect(object capture, string readerSerialNumber)
    {
        Console.WriteLine("[HUELLA] Lector desconectado");
    }

    public void OnSampleQuality(object capture, string readerSerialNumber, CaptureFeedback feedback)
    {
        if (feedback != CaptureFeedback.Good)
            Console.WriteLine("[HUELLA] Calidad: " + feedback.ToString());
    }
}
'@ | Set-Content -Path "FingerprintCaptureService.cs" -Encoding UTF8

# Limpiar
if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
if (Test-Path "obj") { Remove-Item -Recurse -Force "obj" }

Write-Host ""
Write-Host "Listo! Ahora ejecute:" -ForegroundColor Green
Write-Host "  dotnet restore" -ForegroundColor Cyan
Write-Host "  dotnet build" -ForegroundColor Cyan
Write-Host "  dotnet run" -ForegroundColor Cyan
