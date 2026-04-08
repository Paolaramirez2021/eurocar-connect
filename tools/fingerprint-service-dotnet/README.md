# Servicio de Huella Digital .NET - DigitalPersona 4500

## Requisitos
- Windows 10/11
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- DigitalPersona U.are.U 4500 conectado por USB
- Drivers/SDK DigitalPersona instalados (necesita `dpfpdd.dll`)

## Instalacion rapida

```powershell
cd fingerprint-service-dotnet
dotnet restore
dotnet build
```

## Ejecucion

```powershell
dotnet run
```

Salida esperada:
```
============================================================
  EUROCAR - Servicio de Huella Digital DigitalPersona (.NET)
============================================================
  SDK cargado: SI
  Servicio en: http://localhost:5000
  Ctrl+C para detener
============================================================
```

## Endpoints

| Metodo | Ruta               | Descripcion                        |
|--------|--------------------|------------------------------------|
| GET    | /                  | Info del servicio                   |
| GET    | /estado            | Estado del SDK y dispositivo        |
| POST   | /capturar-huella   | Captura huella, retorna PNG base64  |

### Respuesta de /capturar-huella
```json
{
  "status": "success",
  "image": "iVBORw0KGgo..."
}
```

## Donde va dpfpdd.dll

La DLL se instala con el SDK DigitalPersona. Ubicaciones comunes:
- `C:\Program Files\DigitalPersona\Bin\dpfpdd.dll`
- `C:\Program Files (x86)\Crossmatch\U.are.U SDK\Windows\Bin\dpfpdd.dll`

Si el servicio no la encuentra, copie `dpfpdd.dll` en la misma carpeta del ejecutable:
```
fingerprint-service-dotnet/
  bin/Debug/net8.0/
    EurocarFingerprint.dll
    dpfpdd.dll          <-- copiar aqui
```

## Crear ejecutable independiente

```powershell
dotnet publish -c Release -r win-x64 --self-contained
```

El ejecutable estara en `bin/Release/net8.0/win-x64/publish/EurocarFingerprint.exe`

## Solucion de problemas

| Error | Solucion |
|-------|----------|
| dpfpdd.dll no encontrada | Instale el SDK DigitalPersona o copie la DLL |
| No se encontro dispositivo | Verifique que el 4500 este conectado por USB |
| Captura fallida | Coloque el dedo correctamente, centrado en el sensor |
| Puerto 5000 ocupado | Cierre otros servicios en ese puerto o edite Program.cs |
