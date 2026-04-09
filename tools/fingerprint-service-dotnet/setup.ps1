# Ejecutar en PowerShell desde la carpeta del proyecto:
# cd C:\Users\Paola\Downloads\fingerprint-service-dotnet
# .\setup.ps1

Write-Host "Generando archivos del servicio..." -ForegroundColor Green

# 1. EurocarFingerprint.csproj
@'
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <RootNamespace>fingerprint_service_dotnet</RootNamespace>
    <AssemblyName>fingerprint-service-dotnet</AssemblyName>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
'@ | Set-Content -Path "EurocarFingerprint.csproj" -Encoding UTF8

# 2. Program.cs
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

var captureService = new FingerprintCaptureService();
bool sdkReady = captureService.Initialize();

app.MapGet("/", () => Results.Ok(new
{
    service = "EUROCAR - Huella Digital",
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
            return Results.Json(new { status = "error", error = "SDK no disponible" }, statusCode: 503);
        string base64 = captureService.CaptureFingerprint();
        Console.WriteLine("[HUELLA] Captura exitosa");
        return Results.Ok(new { status = "success", image = base64 });
    }
    catch (Exception ex)
    {
        Console.WriteLine("[HUELLA] Error: " + ex.Message);
        return Results.Json(new { status = "error", error = ex.Message }, statusCode: 500);
    }
});

Console.WriteLine("============================================================");
Console.WriteLine("  EUROCAR - Huella Digital DigitalPersona 4500 v2.2");
Console.WriteLine("  SDK: " + (sdkReady ? "SI" : "NO"));
Console.WriteLine("  URL: http://localhost:5000");
Console.WriteLine("============================================================");

app.Run();
'@ | Set-Content -Path "Program.cs" -Encoding UTF8

# 3. FingerprintCaptureService.cs
@'
using System;
using System.IO;
using System.Runtime.InteropServices;

namespace fingerprint_service_dotnet;

public class FingerprintCaptureService : IDisposable
{
    private bool _sdkInitialized = false;
    private readonly object _lock = new();
    private const string DPFPDD_DLL = "dpfpdd.dll";
    private const int DPFPDD_SUCCESS = 0;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    private struct DPFPDD_DEV_INFO
    {
        public uint size;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 1024)]
        public string name;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 896)]
        public byte[] padding;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DPFPDD_CAPTURE_PARAM
    {
        public uint size;
        public uint image_fmt;
        public uint image_proc;
        public uint image_res;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DPFPDD_IMAGE_INFO
    {
        public uint size;
        public uint width;
        public uint height;
        public uint res;
        public uint bpp;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DPFPDD_CAPTURE_RESULT
    {
        public uint size;
        public int success;
        public uint quality;
        public uint score;
        public DPFPDD_IMAGE_INFO info;
    }

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl)]
    private static extern int dpfpdd_init();

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl)]
    private static extern int dpfpdd_exit();

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl)]
    private static extern int dpfpdd_query_devices(ref uint dev_cnt, IntPtr dev_infos);

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private static extern int dpfpdd_open(string dev_name, ref IntPtr hdev);

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl)]
    private static extern int dpfpdd_close(IntPtr hdev);

    [DllImport(DPFPDD_DLL, CallingConvention = CallingConvention.Cdecl)]
    private static extern int dpfpdd_capture(
        IntPtr hdev,
        ref DPFPDD_CAPTURE_PARAM param,
        uint timeout_ms,
        ref DPFPDD_CAPTURE_RESULT result,
        ref uint image_size,
        byte[] image_data
    );

    public bool Initialize()
    {
        lock (_lock)
        {
            if (_sdkInitialized) return true;
            try
            {
                int ret = dpfpdd_init();
                if (ret != DPFPDD_SUCCESS)
                {
                    Console.WriteLine("[HUELLA] Error init SDK: 0x" + ret.ToString("X8"));
                    return false;
                }
                _sdkInitialized = true;
                Console.WriteLine("[HUELLA] SDK OK");
                return true;
            }
            catch (DllNotFoundException)
            {
                Console.WriteLine("[HUELLA] dpfpdd.dll NO encontrada");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[HUELLA] Error: " + ex.Message);
                return false;
            }
        }
    }

    public string CaptureFingerprint(uint timeoutMs = 15000)
    {
        lock (_lock)
        {
            if (!_sdkInitialized)
                throw new InvalidOperationException("SDK no inicializado");

            string deviceName = FindDevice();
            Console.WriteLine("[HUELLA] Dispositivo: " + deviceName);

            IntPtr hdev = IntPtr.Zero;
            int ret = dpfpdd_open(deviceName, ref hdev);
            if (ret != DPFPDD_SUCCESS)
                throw new Exception("Error abriendo dispositivo: 0x" + ret.ToString("X8"));

            try
            {
                var (pixels, width, height) = CaptureRawImage(hdev, timeoutMs);
                Console.WriteLine("[HUELLA] Captura: " + width + "x" + height);
                byte[] bmpBytes = RawToBmp(pixels, (int)width, (int)height);
                return Convert.ToBase64String(bmpBytes);
            }
            finally
            {
                dpfpdd_close(hdev);
            }
        }
    }

    private string FindDevice()
    {
        uint devCount = 0;
        dpfpdd_query_devices(ref devCount, IntPtr.Zero);
        if (devCount == 0)
            throw new Exception("No hay dispositivo de huella conectado");

        int structSize = Marshal.SizeOf<DPFPDD_DEV_INFO>();
        IntPtr buffer = Marshal.AllocHGlobal(structSize * (int)devCount);
        try
        {
            for (int i = 0; i < (int)devCount; i++)
                Marshal.WriteInt32(buffer + (i * structSize), structSize);

            int ret = dpfpdd_query_devices(ref devCount, buffer);
            if (ret != DPFPDD_SUCCESS)
                throw new Exception("Error listando dispositivos: 0x" + ret.ToString("X8"));

            var devInfo = Marshal.PtrToStructure<DPFPDD_DEV_INFO>(buffer);
            return devInfo.name;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private (byte[] pixels, uint width, uint height) CaptureRawImage(IntPtr hdev, uint timeoutMs)
    {
        var param = new DPFPDD_CAPTURE_PARAM
        {
            size = (uint)Marshal.SizeOf<DPFPDD_CAPTURE_PARAM>(),
            image_fmt = 0x00000000,
            image_proc = 0,
            image_res = 500
        };

        var result = new DPFPDD_CAPTURE_RESULT
        {
            size = (uint)Marshal.SizeOf<DPFPDD_CAPTURE_RESULT>()
        };

        uint imgSize = 0;
        dpfpdd_capture(hdev, ref param, 0, ref result, ref imgSize, null);
        if (imgSize == 0) imgSize = 512 * 512;

        byte[] imgData = new byte[imgSize];
        Console.WriteLine("[HUELLA] Coloque el dedo en el sensor...");

        int ret = dpfpdd_capture(hdev, ref param, timeoutMs, ref result, ref imgSize, imgData);
        if (ret != DPFPDD_SUCCESS)
            throw new Exception("Error captura: 0x" + ret.ToString("X8"));
        if (result.success == 0)
            throw new Exception("Ponga el dedo centrado e intente de nuevo");

        uint w = result.info.width;
        uint h = result.info.height;
        byte[] pixels = new byte[w * h];
        Array.Copy(imgData, pixels, Math.Min(imgSize, w * h));
        return (pixels, w, h);
    }

    private static byte[] RawToBmp(byte[] grayPixels, int width, int height)
    {
        int rowSize = ((width + 3) / 4) * 4;
        int pixelDataSize = rowSize * height;
        int paletteSize = 256 * 4;
        int headerSize = 14 + 40;
        int fileSize = headerSize + paletteSize + pixelDataSize;

        byte[] bmp = new byte[fileSize];
        using var ms = new MemoryStream(bmp);
        using var bw = new BinaryWriter(ms);

        bw.Write((byte)0x42); bw.Write((byte)0x4D);
        bw.Write(fileSize);
        bw.Write((short)0); bw.Write((short)0);
        bw.Write(headerSize + paletteSize);

        bw.Write(40);
        bw.Write(width); bw.Write(height);
        bw.Write((short)1); bw.Write((short)8);
        bw.Write(0); bw.Write(pixelDataSize);
        bw.Write(3937); bw.Write(3937);
        bw.Write(256); bw.Write(0);

        for (int i = 0; i < 256; i++)
        {
            bw.Write((byte)i); bw.Write((byte)i);
            bw.Write((byte)i); bw.Write((byte)0);
        }

        for (int y = height - 1; y >= 0; y--)
        {
            for (int x = 0; x < width; x++)
            {
                int idx = y * width + x;
                bw.Write(idx < grayPixels.Length ? grayPixels[idx] : (byte)255);
            }
            for (int p = width; p < rowSize; p++)
                bw.Write((byte)0);
        }

        return bmp;
    }

    public void Dispose()
    {
        lock (_lock)
        {
            if (_sdkInitialized)
            {
                dpfpdd_exit();
                _sdkInitialized = false;
            }
        }
    }
}
'@ | Set-Content -Path "FingerprintCaptureService.cs" -Encoding UTF8

# Limpiar compilaciones anteriores
if (Test-Path "bin") { Remove-Item -Recurse -Force "bin" }
if (Test-Path "obj") { Remove-Item -Recurse -Force "obj" }

Write-Host ""
Write-Host "Archivos generados correctamente!" -ForegroundColor Green
Write-Host "Ahora ejecute:" -ForegroundColor Yellow
Write-Host "  dotnet build" -ForegroundColor Cyan
Write-Host "  dotnet run" -ForegroundColor Cyan
