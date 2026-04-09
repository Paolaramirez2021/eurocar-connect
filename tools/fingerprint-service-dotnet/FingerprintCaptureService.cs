using System;
using System.IO;
using System.Runtime.InteropServices;

namespace fingerprint_service_dotnet;

/// <summary>
/// Servicio que captura huella REAL del DigitalPersona 4500 via dpfpdd.dll
/// y la retorna como imagen PNG en base64.
/// </summary>
public class FingerprintCaptureService : IDisposable
{
    private bool _sdkInitialized = false;
    private readonly object _lock = new();

    // ── SDK DLL Imports ─────────────────────────────────────────

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
        byte[]? image_data
    );

    // ── Metodos publicos ────────────────────────────────────────

    /// <summary>
    /// Inicializa el SDK de DigitalPersona. Llamar una vez al inicio.
    /// </summary>
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
                    Console.WriteLine($"[HUELLA] Error inicializando SDK: 0x{ret:X8}");
                    return false;
                }
                _sdkInitialized = true;
                Console.WriteLine("[HUELLA] SDK DigitalPersona inicializado OK");
                return true;
            }
            catch (DllNotFoundException)
            {
                Console.WriteLine("[HUELLA] ERROR: dpfpdd.dll no encontrada.");
                Console.WriteLine("[HUELLA] Copie dpfpdd.dll de su instalacion del SDK DigitalPersona");
                Console.WriteLine("[HUELLA] a la carpeta del ejecutable, o instale el SDK completo.");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[HUELLA] Error inesperado: {ex.Message}");
                return false;
            }
        }
    }

    /// <summary>
    /// Captura huella del dispositivo y retorna PNG en base64.
    /// Espera hasta 15 segundos a que el usuario ponga el dedo.
    /// </summary>
    public string CaptureFingerprint(uint timeoutMs = 15000)
    {
        lock (_lock)
        {
            if (!_sdkInitialized)
                throw new InvalidOperationException("SDK no inicializado");

            // 1. Buscar dispositivos conectados
            string deviceName = FindDevice();
            Console.WriteLine($"[HUELLA] Abriendo dispositivo: {deviceName}");

            // 2. Abrir dispositivo
            IntPtr hdev = IntPtr.Zero;
            int ret = dpfpdd_open(deviceName, ref hdev);
            if (ret != DPFPDD_SUCCESS)
                throw new Exception($"Error abriendo dispositivo: 0x{ret:X8}");

            try
            {
                // 3. Capturar imagen raw del sensor
                var (pixels, width, height) = CaptureRawImage(hdev, timeoutMs);
                Console.WriteLine($"[HUELLA] Imagen capturada: {width}x{height}");

                // 4. Convertir pixeles raw a BMP y luego a base64
                byte[] bmpBytes = RawToBmp(pixels, (int)width, (int)height);
                return Convert.ToBase64String(bmpBytes);
            }
            finally
            {
                dpfpdd_close(hdev);
            }
        }
    }

    // ── Metodos privados ────────────────────────────────────────

    private string FindDevice()
    {
        uint devCount = 0;
        dpfpdd_query_devices(ref devCount, IntPtr.Zero);

        if (devCount == 0)
            throw new Exception("No se encontro ningun dispositivo de huella conectado. Verifique la conexion USB.");

        int structSize = Marshal.SizeOf<DPFPDD_DEV_INFO>();
        IntPtr buffer = Marshal.AllocHGlobal(structSize * (int)devCount);

        try
        {
            for (int i = 0; i < (int)devCount; i++)
                Marshal.WriteInt32(buffer + (i * structSize), structSize);

            int ret = dpfpdd_query_devices(ref devCount, buffer);
            if (ret != DPFPDD_SUCCESS)
                throw new Exception($"Error enumerando dispositivos: 0x{ret:X8}");

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
            image_fmt = 0x00000000,  // PIXEL_BUFFER (raw grayscale)
            image_proc = 0,          // DEFAULT
            image_res = 500          // 500 DPI
        };

        var result = new DPFPDD_CAPTURE_RESULT
        {
            size = (uint)Marshal.SizeOf<DPFPDD_CAPTURE_RESULT>()
        };

        // Primera llamada: obtener tamanio del buffer necesario
        uint imgSize = 0;
        dpfpdd_capture(hdev, ref param, 0, ref result, ref imgSize, null);
        if (imgSize == 0) imgSize = 512 * 512;

        byte[] imgData = new byte[imgSize];

        Console.WriteLine("[HUELLA] Esperando huella... Coloque el dedo en el sensor.");

        int ret = dpfpdd_capture(hdev, ref param, timeoutMs, ref result, ref imgSize, imgData);

        if (ret != DPFPDD_SUCCESS)
            throw new Exception($"Error capturando huella (0x{ret:X8}). Intente de nuevo.");

        if (result.success == 0)
            throw new Exception("Captura fallida. Coloque el dedo centrado en el sensor e intente de nuevo.");

        uint w = result.info.width;
        uint h = result.info.height;

        byte[] pixels = new byte[w * h];
        Array.Copy(imgData, pixels, Math.Min(imgSize, w * h));

        return (pixels, w, h);
    }

    /// <summary>
    /// Convierte pixeles grayscale raw a formato BMP (sin dependencias externas).
    /// </summary>
    private static byte[] RawToBmp(byte[] grayPixels, int width, int height)
    {
        // BMP con paleta de 256 grises (8-bit indexed)
        int rowSize = ((width + 3) / 4) * 4; // rows padded to 4 bytes
        int pixelDataSize = rowSize * height;
        int paletteSize = 256 * 4; // 256 colors x 4 bytes (BGRA)
        int headerSize = 14 + 40; // file header + info header
        int fileSize = headerSize + paletteSize + pixelDataSize;

        byte[] bmp = new byte[fileSize];
        using var ms = new MemoryStream(bmp);
        using var bw = new BinaryWriter(ms);

        // ── File Header (14 bytes) ──
        bw.Write((byte)'B');
        bw.Write((byte)'M');
        bw.Write(fileSize);
        bw.Write((short)0); // reserved1
        bw.Write((short)0); // reserved2
        bw.Write(headerSize + paletteSize); // offset to pixel data

        // ── Info Header (40 bytes) ──
        bw.Write(40); // header size
        bw.Write(width);
        bw.Write(height);
        bw.Write((short)1); // planes
        bw.Write((short)8); // bits per pixel
        bw.Write(0); // compression (none)
        bw.Write(pixelDataSize);
        bw.Write(3937); // horizontal resolution (~100 DPI)
        bw.Write(3937); // vertical resolution
        bw.Write(256); // colors used
        bw.Write(0); // important colors

        // ── Color Palette (256 grays) ──
        for (int i = 0; i < 256; i++)
        {
            bw.Write((byte)i); // Blue
            bw.Write((byte)i); // Green
            bw.Write((byte)i); // Red
            bw.Write((byte)0); // Reserved
        }

        // ── Pixel Data (bottom-up, padded rows) ──
        for (int y = height - 1; y >= 0; y--)
        {
            for (int x = 0; x < width; x++)
            {
                int idx = y * width + x;
                bw.Write(idx < grayPixels.Length ? grayPixels[idx] : (byte)255);
            }
            // Padding to 4-byte boundary
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
                Console.WriteLine("[HUELLA] SDK liberado");
            }
        }
    }
}
