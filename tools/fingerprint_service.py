"""
Servicio Local de Captura de Huella Digital - DigitalPersona 4500
================================================================

Este servicio se ejecuta en Windows junto al huellero USB.
Expone un endpoint HTTP local que la aplicacion web llama
para capturar la huella como imagen PNG en base64.

REQUISITOS:
  1. Python 3.8+ instalado en Windows
  2. DigitalPersona U.are.U 4500 SDK instalado
     - Descargar de: https://www.crossmatch.com/software/
     - O usar el CD que viene con el dispositivo
  3. pip install flask flask-cors Pillow

INSTALACION:
  pip install flask flask-cors Pillow

EJECUCION:
  python fingerprint_service.py

El servicio estara disponible en http://localhost:5000
La aplicacion web automaticamente se conecta a este servicio.
"""

import os
import sys
import ctypes
import ctypes.wintypes
import base64
import io
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DigitalPersona SDK via ctypes (dpfpdd.dll)
# ---------------------------------------------------------------------------

# Paths comunes donde se instala el SDK
SDK_PATHS = [
    r"C:\Program Files\DigitalPersona\Bin",
    r"C:\Program Files (x86)\DigitalPersona\Bin",
    r"C:\Program Files\Crossmatch\U.are.U SDK\Windows\Bin",
    r"C:\Program Files (x86)\Crossmatch\U.are.U SDK\Windows\Bin",
    os.path.dirname(os.path.abspath(__file__)),
]

dpfpdd = None
dpfj = None


def load_sdk():
    """Intenta cargar las DLLs del SDK de DigitalPersona."""
    global dpfpdd, dpfj

    for sdk_path in SDK_PATHS:
        dll_path = os.path.join(sdk_path, "dpfpdd.dll")
        if os.path.exists(dll_path):
            try:
                os.add_dll_directory(sdk_path)
                dpfpdd = ctypes.WinDLL(dll_path)
                dpfj_path = os.path.join(sdk_path, "dpfj.dll")
                if os.path.exists(dpfj_path):
                    dpfj = ctypes.WinDLL(dpfj_path)
                logger.info(f"SDK cargado desde: {sdk_path}")
                return True
            except Exception as e:
                logger.warning(f"Error cargando SDK desde {sdk_path}: {e}")

    logger.warning("No se encontro el SDK de DigitalPersona. Usando modo simulado.")
    return False


SDK_LOADED = load_sdk()

# Constantes del SDK
DPFPDD_SUCCESS = 0
DPFPDD_IMG_FMT_ANSI381 = 0x001B0401
MAX_DEVICE_NAME_LEN = 1024

# Estructuras
class DPFPDD_DEV_INFO(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("name", ctypes.c_char * MAX_DEVICE_NAME_LEN),
    ]

class DPFPDD_CAPTURE_PARAM(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("image_fmt", ctypes.c_uint),
        ("image_proc", ctypes.c_uint),
        ("image_res", ctypes.c_uint),
    ]

class DPFPDD_CAPTURE_RESULT(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("success", ctypes.c_int),
        ("quality", ctypes.c_uint),
        ("score", ctypes.c_uint),
        ("info", ctypes.c_uint * 4),
    ]


def capture_fingerprint_from_device():
    """
    Captura una huella del DigitalPersona 4500 y retorna bytes PNG.
    """
    if not SDK_LOADED or dpfpdd is None:
        raise RuntimeError("SDK de DigitalPersona no disponible")

    # Inicializar biblioteca
    ret = dpfpdd.dpfpdd_init()
    if ret != DPFPDD_SUCCESS:
        raise RuntimeError(f"Error inicializando SDK: {ret}")

    try:
        # Enumerar dispositivos
        dev_count = ctypes.c_uint(0)
        dpfpdd.dpfpdd_query_devices(ctypes.byref(dev_count), None)

        if dev_count.value == 0:
            raise RuntimeError("No se encontro ningun dispositivo de huella conectado")

        dev_infos = (DPFPDD_DEV_INFO * dev_count.value)()
        for i in range(dev_count.value):
            dev_infos[i].size = ctypes.sizeof(DPFPDD_DEV_INFO)

        ret = dpfpdd.dpfpdd_query_devices(ctypes.byref(dev_count), dev_infos)
        if ret != DPFPDD_SUCCESS:
            raise RuntimeError(f"Error enumerando dispositivos: {ret}")

        device_name = dev_infos[0].name
        logger.info(f"Dispositivo encontrado: {device_name.decode('utf-8', errors='ignore')}")

        # Abrir dispositivo
        hdev = ctypes.c_void_p()
        ret = dpfpdd.dpfpdd_open(device_name, ctypes.byref(hdev))
        if ret != DPFPDD_SUCCESS:
            raise RuntimeError(f"Error abriendo dispositivo: {ret}")

        try:
            # Configurar parametros de captura
            cap_param = DPFPDD_CAPTURE_PARAM()
            cap_param.size = ctypes.sizeof(DPFPDD_CAPTURE_PARAM)
            cap_param.image_fmt = DPFPDD_IMG_FMT_ANSI381
            cap_param.image_proc = 2  # DPFPDD_IMG_PROC_DEFAULT
            cap_param.image_res = 500  # 500 DPI

            # Capturar huella (espera hasta 15 segundos)
            cap_result = DPFPDD_CAPTURE_RESULT()
            cap_result.size = ctypes.sizeof(DPFPDD_CAPTURE_RESULT)

            img_size = ctypes.c_uint(500 * 500)  # buffer grande
            img_data = (ctypes.c_ubyte * img_size.value)()

            ret = dpfpdd.dpfpdd_capture(
                hdev, cap_param, 15000,
                ctypes.byref(cap_result),
                ctypes.byref(img_size), img_data
            )

            if ret != DPFPDD_SUCCESS:
                raise RuntimeError(f"Error capturando huella: {ret}")

            if not cap_result.success:
                raise RuntimeError("Captura fallida. Coloque el dedo correctamente.")

            # Convertir imagen raw a PNG usando Pillow
            raw_bytes = bytes(img_data[:img_size.value])
            return raw_to_png(raw_bytes)

        finally:
            dpfpdd.dpfpdd_close(hdev)
    finally:
        dpfpdd.dpfpdd_exit()


def raw_to_png(raw_data):
    """Convierte imagen raw de huella a PNG."""
    from PIL import Image

    # La imagen del DigitalPersona 4500 tipicamente es 320x480 o similar a 500DPI
    # El formato ANSI 381 tiene un header que indica dimensiones
    # Para simplificar, asumimos grayscale con header
    try:
        # Intentar leer como formato ANSI 381 (skip header de 46 bytes)
        header_size = 46
        if len(raw_data) > header_size:
            pixel_data = raw_data[header_size:]
            # El 4500 captura a ~320x480
            width = 320
            height = len(pixel_data) // width
            if height > 0:
                img = Image.frombytes("L", (width, height), pixel_data[:width * height])
            else:
                raise ValueError("Datos insuficientes")
        else:
            raise ValueError("Datos muy cortos")
    except Exception:
        # Fallback: intentar como raw 256x360 (otro formato comun)
        try:
            width = 256
            height = len(raw_data) // width
            img = Image.frombytes("L", (width, height), raw_data[:width * height])
        except Exception:
            raise RuntimeError("No se pudo decodificar la imagen de huella")

    # Mejorar contraste
    from PIL import ImageEnhance
    img = ImageEnhance.Contrast(img).enhance(1.5)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Endpoints HTTP
# ---------------------------------------------------------------------------

@app.route("/capturar-huella", methods=["GET", "POST"])
def capturar_huella():
    """
    Captura una huella del dispositivo DigitalPersona.
    Retorna: { "status": "success", "image": "<base64 PNG>" }
    """
    try:
        png_bytes = capture_fingerprint_from_device()
        b64 = base64.b64encode(png_bytes).decode("utf-8")
        logger.info(f"Huella capturada: {len(png_bytes)} bytes")
        return jsonify({"status": "success", "image": b64})
    except Exception as e:
        logger.error(f"Error capturando huella: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/estado", methods=["GET"])
def estado():
    """Verifica el estado del servicio y dispositivo."""
    return jsonify({
        "status": "running",
        "sdk_loaded": SDK_LOADED,
        "version": "1.0.0",
    })


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "EUROCAR - Servicio de Huella Digital",
        "endpoints": {
            "POST /capturar-huella": "Captura huella del dispositivo",
            "GET /estado": "Estado del servicio",
        }
    })


if __name__ == "__main__":
    print("=" * 60)
    print("  EUROCAR - Servicio de Huella Digital DigitalPersona")
    print("=" * 60)
    print(f"  SDK cargado: {'SI' if SDK_LOADED else 'NO'}")
    print(f"  Servicio en: http://localhost:5000")
    print("  Ctrl+C para detener")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False)
