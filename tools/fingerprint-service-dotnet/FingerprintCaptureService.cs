using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System.Runtime.InteropServices;

namespace EurocarFingerprint;

/// <summary>
/// Servicio de captura de huella DigitalPersona 4500 usando dpfpdd.dll
/// Captura imagen raw del sensor y la devuelve como PNG base64.
/// </summary>
public class FingerprintCaptureService : IDisposable
{
    private readonly ILogger<FingerprintCaptureService> _logger;
    private bool _sdkInitialized;
    private readonly object _lock = new();

    public FingerprintCaptureService(ILogger<FingerprintCaptureService> logger)
    {
        _logger = logger;
    }

    public bool Initialize()
    {
        lock (_lock)
        {
            if (_sdkInitialized) return true;

            try
            {
                int ret = DpfpddNative.dpfpdd_init();
                if (ret != DpfpddNative.DPFPDD_SUCCESS)
                {
                    _logger.LogError("Error inicializando SDK dpfpdd: 0x{Code:X8}", ret);
                    return false;
                }

                _sdkInitialized = true;
                _logger.LogInformation("SDK DigitalPersona inicializado correctamente");
                return true;
            }
            catch (DllNotFoundException)
            {
                _logger.LogError(
                    "dpfpdd.dll no encontrada. Instale el SDK DigitalPersona U.are.U " +
                    "o copie dpfpdd.dll junto al ejecutable.");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado inicializando SDK");
                return false;
            }
        }
    }

    public byte[] CaptureFingerprint(uint timeoutMs = 15000)
    {
        lock (_lock)
        {
            if (!_sdkInitialized)
                throw new InvalidOperationException("SDK no inicializado");

            string deviceName = FindDevice();

            IntPtr hdev = IntPtr.Zero;
            int ret = DpfpddNative.dpfpdd_open(deviceName, ref hdev);
            if (ret != DpfpddNative.DPFPDD_SUCCESS)
                throw new Exception($"Error abriendo dispositivo: 0x{ret:X8}");

            try
            {
                var (rawPixels, width, height) = CaptureRawImage(hdev, timeoutMs);
                return RawToPng(rawPixels, (int)width, (int)height);
            }
            finally
            {
                DpfpddNative.dpfpdd_close(hdev);
            }
        }
    }

    private string FindDevice()
    {
        uint devCount = 0;
        DpfpddNative.dpfpdd_query_devices(ref devCount, IntPtr.Zero);

        if (devCount == 0)
            throw new Exception("No se encontro ningun dispositivo de huella conectado");

        int structSize = Marshal.SizeOf<DpfpddNative.DPFPDD_DEV_INFO>();
        IntPtr buffer = Marshal.AllocHGlobal(structSize * (int)devCount);

        try
        {
            for (int i = 0; i < (int)devCount; i++)
                Marshal.WriteInt32(buffer + (i * structSize), structSize);

            int ret = DpfpddNative.dpfpdd_query_devices(ref devCount, buffer);
            if (ret != DpfpddNative.DPFPDD_SUCCESS)
                throw new Exception($"Error enumerando dispositivos: 0x{ret:X8}");

            var devInfo = Marshal.PtrToStructure<DpfpddNative.DPFPDD_DEV_INFO>(buffer);
            _logger.LogInformation("Dispositivo: {Product} - {Name}",
                devInfo.descr.product_name, devInfo.name);

            return devInfo.name;
        }
        finally
        {
            Marshal.FreeHGlobal(buffer);
        }
    }

    private (byte[] pixels, uint width, uint height) CaptureRawImage(IntPtr hdev, uint timeoutMs)
    {
        var param = new DpfpddNative.DPFPDD_CAPTURE_PARAM
        {
            size = (uint)Marshal.SizeOf<DpfpddNative.DPFPDD_CAPTURE_PARAM>(),
            image_fmt = DpfpddNative.DPFPDD_IMG_FMT_PIXEL_BUFFER,
            image_proc = DpfpddNative.DPFPDD_IMG_PROC_DEFAULT,
            image_res = 500
        };

        var result = new DpfpddNative.DPFPDD_CAPTURE_RESULT
        {
            size = (uint)Marshal.SizeOf<DpfpddNative.DPFPDD_CAPTURE_RESULT>()
        };

        uint imgSize = 0;
        DpfpddNative.dpfpdd_capture(hdev, ref param, 0, ref result, ref imgSize, null);
        if (imgSize == 0) imgSize = 512 * 512;

        byte[] imgData = new byte[imgSize];

        _logger.LogInformation("Esperando huella... (timeout: {T}s)", timeoutMs / 1000);

        int ret = DpfpddNative.dpfpdd_capture(
            hdev, ref param, timeoutMs, ref result, ref imgSize, imgData);

        if (ret != DpfpddNative.DPFPDD_SUCCESS)
            throw new Exception($"Error capturando huella: 0x{ret:X8}");

        if (result.success == 0)
            throw new Exception("Captura fallida. Coloque el dedo correctamente en el sensor.");

        uint w = result.info.width;
        uint h = result.info.height;

        _logger.LogInformation("Huella capturada: {W}x{H}, calidad={Q}", w, h, result.quality);

        byte[] pixels = new byte[w * h];
        Array.Copy(imgData, pixels, Math.Min(imgSize, w * h));

        return (pixels, w, h);
    }

    private static byte[] RawToPng(byte[] grayPixels, int width, int height)
    {
        using var image = new Image<L8>(width, height);

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int idx = y * width + x;
                byte val = idx < grayPixels.Length ? grayPixels[idx] : (byte)255;
                image[x, y] = new L8(val);
            }
        }

        image.Mutate(ctx => ctx.AutoLevel());

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    public void Dispose()
    {
        lock (_lock)
        {
            if (_sdkInitialized)
            {
                DpfpddNative.dpfpdd_exit();
                _sdkInitialized = false;
                _logger.LogInformation("SDK DigitalPersona liberado");
            }
        }
    }
}
