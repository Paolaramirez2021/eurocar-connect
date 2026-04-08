# Servicio Local de Huella Digital - DigitalPersona 4500
## Guia de Instalacion para Windows

### 1. Requisitos previos
- Windows 10/11
- Python 3.8 o superior (descargar de https://python.org)
- DigitalPersona U.are.U 4500 conectado por USB
- Drivers del DigitalPersona instalados (SDK o drivers del CD del dispositivo)

### 2. Instalar dependencias Python
Abra CMD o PowerShell como administrador:
```
pip install flask flask-cors Pillow
```

### 3. Copiar el archivo de servicio
Copie el archivo `fingerprint_service.py` a una carpeta en su PC, por ejemplo:
```
C:\EUROCAR\fingerprint_service.py
```

### 4. Ejecutar el servicio
```
cd C:\EUROCAR
python fingerprint_service.py
```

Debera ver:
```
============================================================
  EUROCAR - Servicio de Huella Digital DigitalPersona
============================================================
  SDK cargado: SI
  Servicio en: http://localhost:5000
  Ctrl+C para detener
============================================================
```

### 5. Uso desde la aplicacion web
1. Con el servicio ejecutandose, abra la aplicacion EUROCAR en el navegador
2. En el formulario de firma de contrato, haga clic en **"Usar Huellero Digital"**
3. Coloque el dedo del cliente en el lector cuando el boton muestre "Esperando huella..."
4. La huella se capturara y mostrara automaticamente

### 6. Crear acceso directo para inicio automatico
Cree un archivo `iniciar_huellero.bat` en el escritorio:
```bat
@echo off
echo Iniciando servicio de huella digital...
cd C:\EUROCAR
python fingerprint_service.py
pause
```

### Solucion de problemas
- **"SDK no disponible"**: Verifique que los drivers del DigitalPersona esten instalados
- **"No se encontro dispositivo"**: Verifique que el 4500 este conectado por USB
- **"No se pudo conectar al huellero"**: Verifique que el servicio este corriendo (python fingerprint_service.py)
- **Firewall**: Si el navegador no puede conectar, permita Python en el firewall de Windows
