# Guía de Integración del Lector de Huellas DigitalPersona U.are.U 4500

## Descripción General

El sistema de contratos digitales de EuroCar Connect incluye integración con el lector de huellas **DigitalPersona U.are.U 4500** para capturar huellas digitales en los contratos finales.

## Requisitos del Sistema

### Hardware
- Lector de huellas: **DigitalPersona U.are.U 4500**
- Puerto USB disponible
- Sistema operativo: Windows 7 o superior

### Software Requerido

#### 1. DigitalPersona Client/Agent (Obligatorio)

El navegador web **NO puede acceder directamente** al hardware USB por razones de seguridad. Por lo tanto, se requiere instalar un servicio local que actúe como puente entre la aplicación web y el lector de huellas.

**Opciones de instalación:**

**Opción A: DigitalPersona Workstation (Completo)**
- Descargar desde: [HID Global Developer Center](https://sdk.hidglobal.com/developer-center/digitalpersona-touchchip)
- Incluye drivers, SDK y el agente local

**Opción B: DigitalPersona Lite Client (Solo lo necesario)**
- Versión ligera que solo instala el servicio local
- Ocupa menos espacio en disco
- Recomendado para equipos de producción

#### 2. Drivers del Dispositivo
- Generalmente incluidos con DigitalPersona Client
- Si no, descargar desde: [Drivers DigitalPersona UareU](https://www.hidglobal.com/products/4500-fingerprint-reader)

## Instalación Paso a Paso

### 1. Instalar el Cliente DigitalPersona

1. Descarga el instalador apropiado (Workstation o Lite Client)
2. Ejecuta el instalador con permisos de administrador
3. Sigue el asistente de instalación
4. Reinicia el equipo si es requerido

### 2. Conectar el Lector de Huellas

1. Conecta el lector DigitalPersona U.are.U 4500 a un puerto USB
2. Windows debería reconocer el dispositivo automáticamente
3. Verifica en "Administrador de Dispositivos" que aparece como "DigitalPersona Fingerprint Reader"

### 3. Verificar el Servicio Local

El servicio local (DigitalPersona Agent) debe estar ejecutándose:

**En Windows:**
1. Presiona `Win + R`
2. Escribe `services.msc` y presiona Enter
3. Busca "DigitalPersona" en la lista de servicios
4. Verifica que esté en estado "En ejecución"

El servicio generalmente se ejecuta en: `http://localhost:3070` o similar

### 4. Configurar Excepciones de Firewall

Si el firewall de Windows está activo:

1. Ve a "Panel de Control" > "Sistema y Seguridad" > "Firewall de Windows"
2. Clic en "Configuración avanzada"
3. Asegúrate de que el DigitalPersona Agent tenga permiso para comunicación local

## Cómo Funciona la Integración

### Arquitectura

```
[Navegador Web (EuroCar Connect)]
           ↓
      [JavaScript API]
           ↓
    [@digitalpersona/devices]
           ↓
   [DigitalPersona Agent (localhost)]
           ↓
    [Lector USB U.are.U 4500]
```

### Flujo de Captura

1. El usuario hace clic en "Capturar Huella" en la interfaz web
2. JavaScript llama a la librería `@digitalpersona/devices`
3. La librería envía una solicitud al servicio local (DigitalPersona Agent)
4. El servicio activa el lector de huellas
5. El usuario coloca su dedo en el lector
6. El lector captura la imagen de la huella
7. La imagen se devuelve al navegador en formato PNG base64
8. La aplicación muestra la huella capturada
9. Al generar el contrato final, la huella se embebe en el PDF

## Uso en la Aplicación

### En el Módulo "Contrato Final"

1. Selecciona una reserva confirmada
2. Captura la firma manuscrita usando la tableta Gaomon S620
3. Haz clic en **"Capturar Huella"**
   - Si el lector está disponible, se mostrará "Coloca tu dedo en el lector..."
   - La huella se captura automáticamente cuando detecta el dedo
4. Captura la foto del cliente usando la cámara web
5. Genera el contrato final (incluirá firma, huella y foto)

### Indicadores en la UI

- ✅ **Lector detectado**: Marca verde y mensaje de éxito
- ⚠️ **Lector no detectado**: Advertencia naranja con instrucciones
- 🔄 **Capturando...**: Indicador mientras se espera la huella

## Troubleshooting (Solución de Problemas)

### Problema: "Lector no detectado"

**Solución:**
1. Verifica que el lector esté conectado correctamente
2. Comprueba que el servicio DigitalPersona Agent esté corriendo
3. Reinicia el navegador web
4. Reinicia el servicio DigitalPersona Agent
5. Reinstala el DigitalPersona Client si es necesario

### Problema: "Error al capturar huella"

**Solución:**
1. Limpia el sensor del lector con un paño suave
2. Asegúrate de que el dedo esté limpio y seco
3. Presiona el dedo firmemente sobre el lector
4. Intenta con otro dedo

### Problema: CORS o errores de conexión

**Solución:**
1. Verifica que el DigitalPersona Agent permita conexiones desde localhost
2. Añade excepciones en el antivirus si es necesario
3. Usa HTTPS si la aplicación está en producción

### Problema: El contrato se genera sin huella

**Nota:** El sistema **permite generar contratos finales sin huella** si el lector no está disponible. Sin embargo:
- La firma digital es **obligatoria**
- La foto del cliente es **obligatoria**
- La huella es **opcional** (se recomienda capturarla cuando sea posible)

## Información Técnica Adicional

### Librerías Utilizadas

- `@digitalpersona/devices`: SDK oficial de HID Global para captura de huellas en navegadores web
- Versión instalada: 0.2.6 o superior

### Formatos de Captura

- **Formato de salida**: PNG (base64)
- **Resolución típica**: 500 DPI (estándar para huellas dactilares)
- **Tamaño de imagen**: ~50-100 KB por huella

### Seguridad

- Las huellas se capturan localmente en el equipo del cliente
- Las imágenes se transmiten mediante HTTPS
- Las huellas se almacenan en Supabase Storage con acceso controlado
- Se embeben en el PDF del contrato como imagen

## Soporte y Referencias

### Documentación Oficial
- [DigitalPersona Devices Library](https://github.com/hidglobal/digitalpersona-devices)
- [HID Global Developer Center](https://sdk.hidglobal.com/developer-center/digitalpersona-touchchip)
- [Tutorial de Integración Web](https://hidglobal.github.io/digitalpersona-devices/tutorial.html)

### Contacto
Para soporte técnico adicional, contacta a:
- Soporte de HID Global/DigitalPersona
- Equipo de desarrollo de EuroCar Connect

---

**Última actualización**: Enero 2025
**Versión del documento**: 1.0
