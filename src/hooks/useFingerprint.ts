import { useState, useCallback, useEffect } from 'react';
import { FingerprintReader, SampleFormat } from '@digitalpersona/devices';
import { toast } from 'sonner';

interface FingerprintSample {
  Data: string;
  Format: SampleFormat;
}

export const useFingerprint = () => {
  const [isReaderAvailable, setIsReaderAvailable] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [fingerprintImage, setFingerprintImage] = useState<string | null>(null);
  const [reader, setReader] = useState<FingerprintReader | null>(null);

  useEffect(() => {
    // Inicializar el lector de huellas
    const initReader = async () => {
      try {
        const fpReader = new FingerprintReader();
        setReader(fpReader);

        // Verificar si hay dispositivos disponibles
        const devices = await fpReader.enumerateDevices();
        if (devices && devices.length > 0) {
          setIsReaderAvailable(true);
          toast.success(`Lector de huellas detectado: ${devices[0]}`);
        } else {
          setIsReaderAvailable(false);
          toast.warning('No se detectó lector de huellas DigitalPersona. Asegúrate de que el dispositivo esté conectado y el cliente local esté instalado.');
        }
      } catch (error) {
        console.error('Error al inicializar lector de huellas:', error);
        setIsReaderAvailable(false);
        toast.error('Error al conectar con el lector de huellas. Verifica que el DigitalPersona Client esté instalado.');
      }
    };

    initReader();

    return () => {
      // Limpiar al desmontar
      if (reader) {
        reader.stopAcquisition();
      }
    };
  }, []);

  const captureFingerprint = useCallback(async (): Promise<string | null> => {
    if (!reader || !isReaderAvailable) {
      toast.error('Lector de huellas no disponible');
      return null;
    }

    setIsCapturing(true);

    try {
      toast.info('Coloca tu dedo en el lector...');

      // Iniciar captura
      const sample: FingerprintSample = await reader.startAcquisition(SampleFormat.PngImage);

      if (sample && sample.Data) {
        // Convertir los datos a formato base64 para imagen
        const imageData = `data:image/png;base64,${sample.Data}`;
        setFingerprintImage(imageData);
        toast.success('¡Huella capturada exitosamente!');
        return imageData;
      } else {
        toast.error('No se pudo capturar la huella');
        return null;
      }
    } catch (error) {
      console.error('Error al capturar huella:', error);
      toast.error('Error al capturar huella. Intenta de nuevo.');
      return null;
    } finally {
      setIsCapturing(false);
      if (reader) {
        reader.stopAcquisition();
      }
    }
  }, [reader, isReaderAvailable]);

  const clearFingerprint = useCallback(() => {
    setFingerprintImage(null);
  }, []);

  return {
    isReaderAvailable,
    isCapturing,
    fingerprintImage,
    captureFingerprint,
    clearFingerprint,
  };
};
