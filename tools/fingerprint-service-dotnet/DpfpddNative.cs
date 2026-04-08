using System.Runtime.InteropServices;

namespace EurocarFingerprint;

/// <summary>
/// P/Invoke bindings para dpfpdd.dll (DigitalPersona U.are.U SDK)
/// La DLL se distribuye con el SDK instalado en Windows.
/// </summary>
public static class DpfpddNative
{
    private const string DLL = "dpfpdd.dll";

    // ── Códigos de retorno ──────────────────────────────────────────
    public const int DPFPDD_SUCCESS           = 0;
    public const int DPFPDD_E_FAILURE         = 0x01000001;
    public const int DPFPDD_E_NO_DEVICE       = 0x01000005;
    public const int DPFPDD_E_DEVICE_BUSY     = 0x01000006;
    public const int DPFPDD_E_DEVICE_FAILURE  = 0x01000007;

    // ── Formatos de imagen ──────────────────────────────────────────
    public const uint DPFPDD_IMG_FMT_PIXEL_BUFFER = 0x00000000;
    public const uint DPFPDD_IMG_FMT_ANSI381      = 0x001B0401;
    public const uint DPFPDD_IMG_FMT_ISOIEC19794  = 0x01010007;

    // ── Procesamiento de imagen ─────────────────────────────────────
    public const uint DPFPDD_IMG_PROC_DEFAULT      = 0;
    public const uint DPFPDD_IMG_PROC_PIV          = 1;
    public const uint DPFPDD_IMG_PROC_ENHANCED     = 2;
    public const uint DPFPDD_IMG_PROC_UNPROCESSED  = 3;

    // ── Estructuras ─────────────────────────────────────────────────

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DPFPDD_VER
    {
        public int major;
        public int minor;
        public int maintenance;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DPFPDD_HW_DESCR
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string vendor_name;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string product_name;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string serial_num;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DPFPDD_HW_ID
    {
        public ushort vendor_id;
        public ushort product_id;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DPFPDD_HW_VERSION
    {
        public DPFPDD_VER hw_ver;
        public DPFPDD_VER fw_ver;
        public ushort bcd_rev;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DPFPDD_DEV_INFO
    {
        public uint size;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 1024)]
        public string name;
        public DPFPDD_HW_DESCR descr;
        public DPFPDD_HW_ID id;
        public DPFPDD_HW_VERSION ver;
        public uint modality;
        public uint technology;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DPFPDD_DEV_CAPS
    {
        public uint size;
        public int can_capture_image;
        public int can_stream_image;
        public int can_extract_features;
        public int can_match;
        public int can_identify;
        public int has_fp_storage;
        public uint indicator_type;
        public int has_pwr_mgmt;
        public int has_calibration;
        public int piv_compliant;
        public uint resolution_cnt;
        // Resoluciones adicionales se leen aparte si se necesitan
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DPFPDD_CAPTURE_PARAM
    {
        public uint size;
        public uint image_fmt;
        public uint image_proc;
        public uint image_res;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DPFPDD_IMAGE_INFO
    {
        public uint size;
        public uint width;
        public uint height;
        public uint res;
        public uint bpp;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DPFPDD_CAPTURE_RESULT
    {
        public uint size;
        public int success;
        public uint quality;
        public uint score;
        public DPFPDD_IMAGE_INFO info;
    }

    // ── Funciones P/Invoke ──────────────────────────────────────────

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_init();

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_exit();

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_query_devices(ref uint dev_cnt, IntPtr dev_infos);

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    public static extern int dpfpdd_open(string dev_name, ref IntPtr hdev);

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_close(IntPtr hdev);

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_get_device_capabilities(IntPtr hdev, ref DPFPDD_DEV_CAPS caps);

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_capture(
        IntPtr hdev,
        ref DPFPDD_CAPTURE_PARAM param,
        uint timeout_ms,
        ref DPFPDD_CAPTURE_RESULT result,
        ref uint image_size,
        byte[]? image_data
    );

    [DllImport(DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int dpfpdd_cancel(IntPtr hdev);
}
