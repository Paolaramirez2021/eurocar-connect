# Integración de Huellero Digital

## Opciones de Integración

### 1. Huellero USB (Aplicación Web)

Para integrar un huellero digital USB en la aplicación web, necesitarás usar la **Web Serial API**:

#### Pasos:

1. **Verificar compatibilidad del huellero**
   - El dispositivo debe ser compatible con Web Serial API
   - Marcas recomendadas: Digital Persona, Futronic, ZKTeco

2. **Solicitar permiso al usuario**
```typescript
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 9600 });
```

3. **Leer datos del huellero**
```typescript
const reader = port.readable.getReader();
const { value, done } = await reader.read();
// Procesar imagen de huella (típicamente en formato WSQ o RAW)
```

4. **Cerrar conexión**
```typescript
reader.releaseLock();
await port.close();
```

#### Ejemplo de implementación:

```typescript
// src/lib/fingerprintScanner.ts
export class FingerprintScanner {
  private port: SerialPort | null = null;

  async connect() {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      return true;
    } catch (error) {
      console.error('Error connecting to fingerprint scanner:', error);
      return false;
    }
  }

  async capture(): Promise<string | null> {
    if (!this.port) return null;

    const reader = this.port.readable.getReader();
    try {
      const { value } = await reader.read();
      // Convertir datos binarios a imagen base64
      const base64 = btoa(String.fromCharCode(...value));
      return `data:image/png;base64,${base64}`;
    } finally {
      reader.releaseLock();
    }
  }

  async disconnect() {
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }
}
```

### 2. Huellero Bluetooth (Aplicación Móvil)

Para aplicaciones móviles con Capacitor, usa un plugin de Bluetooth:

#### Instalación:
```bash
npm install @capacitor-community/bluetooth-le
npx cap sync
```

#### Implementación:
```typescript
import { BleClient } from '@capacitor-community/bluetooth-le';

async function connectFingerprintScanner() {
  await BleClient.initialize();
  
  const device = await BleClient.requestDevice({
    services: ['YOUR_FINGERPRINT_SCANNER_SERVICE_UUID']
  });

  await BleClient.connect(device.deviceId);
  
  // Leer característica de huella
  const result = await BleClient.read(
    device.deviceId,
    'SERVICE_UUID',
    'CHARACTERISTIC_UUID'
  );
  
  // Convertir a imagen
  return processFingerprint(result);
}
```

### 3. SDK del Fabricante

Muchos fabricantes de huelleros digitales proporcionan SDKs JavaScript:

#### Digital Persona (U.are.U)
```bash
npm install @digitalpersona/devices
```

#### ZKTeco
- Usar su SDK web proporcionado
- Típicamente requiere un servidor bridge local

### 4. Servidor Bridge Local

Para huelleros que no soportan acceso directo desde el navegador:

```
[Navegador] <-- WebSocket --> [Servidor Local] <-- USB --> [Huellero]
```

#### Ejemplo de servidor Node.js:
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    if (message === 'capture') {
      // Comunicarse con el huellero USB
      const fingerprint = await captureFromDevice();
      ws.send(JSON.stringify({ image: fingerprint }));
    }
  });
});
```

## Recomendación

Para su caso de uso (contratos de alquiler):

1. **Opción más simple**: Usar la cámara del dispositivo (ya implementado)
2. **Opción profesional**: Digital Persona U.are.U 4500 con su SDK web
3. **Opción móvil**: Huellero Bluetooth compatible con Capacitor

## Configuración de Seguridad

⚠️ **Importante**: Los navegadores modernos requieren HTTPS para acceder a dispositivos USB/Bluetooth.

Para desarrollo local:
```bash
# Generar certificado SSL local
npx mkcert localhost
```

## Próximos Pasos

1. Elegir el modelo de huellero digital
2. Obtener el SDK del fabricante
3. Implementar la lógica de captura en `FingerprintCapture.tsx`
4. Probar con el dispositivo físico

## Recursos

- [Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Capacitor Bluetooth LE](https://github.com/capacitor-community/bluetooth-le)
- [Digital Persona SDK](https://www.digitalpersona.com/developers/)
