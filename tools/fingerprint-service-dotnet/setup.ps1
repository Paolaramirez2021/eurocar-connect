# cd C:\Users\Paola\Downloads\fingerprint-service-dotnet
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\setup.ps1

Write-Host "Generando archivos con DPUruNet..." -ForegroundColor Green

# 1. CSPROJ
@'
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="DPUruNet">
      <HintPath>C:\Program Files\DigitalPersona\U.are.U SDK\Windows\Lib\.NET\DPUruNet.dll</HintPath>
    </Reference>
    <PackageReference Include="System.Drawing.Common" Version="8.0.0" />
  </ItemGroup>
</Project>
'@ | Set-Content -Path "EurocarFingerprint.csproj" -Encoding UTF8

# 2. PROGRAM.CS
@'
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using fingerprint_service_dotnet;

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
        if (string.IsNullOrEmpty(base64))
            return Results.Json(new { status = "error", error = "No se capturo la huella. Intente de nuevo." }, statusCode: 500);

        Console.WriteLine("[OK] Huella enviada al navegador");
        return Results.Ok(new { status = "success", image = base64 });
    }
    catch (Exception ex)
    {
        Console.WriteLine("[ERROR] " + ex.Message);
        return Results.Json(new { status = "error", error = ex.Message }, statusCode: 500);
    }
});

Console.WriteLine("=========================================");
Console.WriteLine("  EUROCAR Huella Digital v3.0 (DPUruNet)");
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
using System.Runtime.InteropServices;
using System.Threading;
using DPUruNet;

namespace fingerprint_service_dotnet
{
    public class FingerprintCaptureService
    {
        private Reader _reader;
        private string _imageBase64;
        private bool _isCaptureComplete;
        private Exception _captureError;

        public FingerprintCaptureService()
        {
            try
            {
                var readers = ReaderCollection.GetReaders();
                if (readers.Count > 0)
                {
                    _reader = readers[0];
                    Console.WriteLine("[INFO] Lector: " + _reader.Description.Name);
                }
                else
                {
                    Console.WriteLine("[ERROR] No se encontraron lectores de huella.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[ERROR] SDK: " + ex.Message);
            }
        }

        public string CaptureFingerprint()
        {
            _imageBase64 = null;
            _isCaptureComplete = false;
            _captureError = null;

            if (_reader == null)
                throw new Exception("No hay lector de huella conectado.");

            try
            {
                var result = _reader.Open(Constants.CapturePriority.DP_PRIORITY_COOPERATIVE);
                if (result != Constants.ResultCode.DP_SUCCESS)
                    throw new Exception("No se pudo abrir el lector: " + result);

                _reader.On_Captured += OnCaptured;

                Console.WriteLine("[HUELLA] Lector activado. Coloque el dedo...");

                if (!_reader.CaptureAsync(
                    Constants.Formats.Fid.ANSI,
                    Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT,
                    _reader.Capabilities.Resolutions[0]))
                {
                    throw new Exception("No se pudo iniciar la captura asincrona.");
                }

                int timeoutMs = 15000;
                int elapsedMs = 0;
                int delayMs = 100;

                while (!_isCaptureComplete && elapsedMs < timeoutMs && _captureError == null)
                {
                    Thread.Sleep(delayMs);
                    elapsedMs += delayMs;
                }

                if (_captureError != null)
                    throw _captureError;

                if (!_isCaptureComplete)
                    throw new Exception("Tiempo agotado. Coloque el dedo e intente de nuevo.");
            }
            finally
            {
                if (_reader != null)
                {
                    _reader.On_Captured -= OnCaptured;
                    _reader.CancelCapture();
                    _reader.Close();
                }
            }

            return _imageBase64;
        }

        private void OnCaptured(CaptureResult captureResult)
        {
            try
            {
                if (captureResult.ResultCode != Constants.ResultCode.DP_SUCCESS)
                {
                    _captureError = new Exception("Error SDK: " + captureResult.ResultCode);
                    return;
                }

                if (captureResult.Quality != Constants.CaptureQuality.DP_QUALITY_GOOD)
                {
                    Console.WriteLine("[HUELLA] Calidad: " + captureResult.Quality + " - Intente de nuevo");
                    if (!_reader.CaptureAsync(
                        Constants.Formats.Fid.ANSI,
                        Constants.CaptureProcessing.DP_IMG_PROC_DEFAULT,
                        _reader.Capabilities.Resolutions[0]))
                    {
                        _captureError = new Exception("Error reiniciando captura");
                    }
                    return;
                }

                Console.WriteLine("[HUELLA] Captura OK!");

                Fid imageFid = captureResult.Data;
                if (imageFid != null)
                {
                    using (Bitmap bitmap = FidToBitmap(imageFid))
                    {
                        if (bitmap != null)
                        {
                            _imageBase64 = ConvertBitmapToBase64(bitmap);
                        }
                    }
                }
                _isCaptureComplete = true;
            }
            catch (Exception ex)
            {
                _captureError = ex;
            }
        }

        private Bitmap FidToBitmap(Fid imageFid)
        {
            Fid.Fiv view = imageFid.Views[0];
            byte[] rawImage = view.RawImage;
            int width = view.Width;
            int height = view.Height;

            Bitmap bitmap = new Bitmap(width, height, PixelFormat.Format8bppIndexed);

            ColorPalette pal = bitmap.Palette;
            for (int i = 0; i <= 255; i++)
            {
                pal.Entries[i] = Color.FromArgb(i, i, i);
            }
            bitmap.Palette = pal;

            BitmapData bitmapData = bitmap.LockBits(
                new Rectangle(0, 0, width, height),
                ImageLockMode.WriteOnly,
                PixelFormat.Format8bppIndexed);
            try
            {
                Marshal.Copy(rawImage, 0, bitmapData.Scan0, rawImage.Length);
            }
            finally
            {
                bitmap.UnlockBits(bitmapData);
            }

            return bitmap;
        }

        private string ConvertBitmapToBase64(Bitmap bitmap)
        {
            using (MemoryStream ms = new MemoryStream())
            {
                bitmap.Save(ms, ImageFormat.Png);
                return Convert.ToBase64String(ms.ToArray());
            }
        }
    }
}
'@ | Set-Content -Path "FingerprintCaptureService.cs" -Encoding UTF8

# Limpiar compilaciones viejas
if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
if (Test-Path "obj") { Remove-Item -Recurse -Force "obj" }

Write-Host ""
Write-Host "Archivos generados!" -ForegroundColor Green
Write-Host "Ejecute:" -ForegroundColor Yellow
Write-Host "  dotnet restore" -ForegroundColor Cyan
Write-Host "  dotnet build" -ForegroundColor Cyan
Write-Host "  dotnet run" -ForegroundColor Cyan
