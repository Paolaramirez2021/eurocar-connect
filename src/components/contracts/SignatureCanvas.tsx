import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, Pen, Tablet, Loader2 } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
}

// Wacom SigCaptX connection state
type WacomStatus = 'checking' | 'connected' | 'unavailable';

export const SignatureCanvas = ({ onSignatureChange }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const strokeCountRef = useRef(0);
  const [hasSignature, setHasSignature] = useState(false);
  const dprRef = useRef(window.devicePixelRatio || 1);
  const [wacomStatus, setWacomStatus] = useState<WacomStatus>('checking');
  const [wacomCapturing, setWacomCapturing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const penDataRef = useRef<Array<{x: number; y: number; pressure: number}>>([]);

  // Check if Wacom SigCaptX is available
  useEffect(() => {
    checkWacomAvailability();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const checkWacomAvailability = async () => {
    setWacomStatus('checking');
    try {
      // Try connecting to the SigCaptX WebSocket server on port 9000
      const ws = new WebSocket('ws://localhost:9000');
      
      const timeout = setTimeout(() => {
        ws.close();
        setWacomStatus('unavailable');
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('[Wacom] SigCaptX WebSocket conectado');
        wsRef.current = ws;
        setWacomStatus('connected');
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        console.log('[Wacom] SigCaptX no disponible, usando canvas manual');
        setWacomStatus('unavailable');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
    } catch {
      setWacomStatus('unavailable');
    }
  };

  // Capture signature from Wacom STU-500 using SigCaptX
  const startWacomCapture = useCallback(async () => {
    setWacomCapturing(true);
    penDataRef.current = [];

    try {
      // Use the SigCaptX approach: send commands via WebSocket
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Try reconnecting
        await checkWacomAvailability();
        if (!wsRef.current) {
          throw new Error('No se pudo conectar con la tableta Wacom');
        }
      }

      // Send capture command to SigCaptX
      const captureCmd = JSON.stringify({
        method: "wireCapture",
        params: {
          who: "EuroCar Rental",
          why: "Firma de Contrato",
          width: 396,
          height: 100,
          inkColor: "#000000",
          backgroundColor: "#FFFFFF"
        }
      });

      if (wsRef.current) {
        wsRef.current.send(captureCmd);

        // Listen for response
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.method === "wireCapture" && data.result) {
              // Signature captured - data.result contains base64 image
              if (data.result.image) {
                const imgDataUrl = `data:image/png;base64,${data.result.image}`;
                drawImageToCanvas(imgDataUrl);
                setWacomCapturing(false);
              } else if (data.result.status === "cancelled") {
                setWacomCapturing(false);
              }
            } else if (data.penData) {
              // Real-time pen data - draw on canvas
              drawPenPoint(data.penData.x, data.penData.y, data.penData.pressure);
            }
          } catch (e) {
            console.error('[Wacom] Error parsing response:', e);
          }
        };
      }
    } catch (error) {
      console.error('[Wacom] Error de captura:', error);
      setWacomCapturing(false);
      setWacomStatus('unavailable');
    }
  }, []);

  const drawImageToCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dprRef.current, dprRef.current);

      // Draw the Wacom signature image, fitting to canvas
      const displayWidth = canvas.width / dprRef.current;
      const displayHeight = 200;
      const scale = Math.min(displayWidth / img.width, displayHeight / img.height) * 0.9;
      const x = (displayWidth - img.width * scale) / 2;
      const y = (displayHeight - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      strokeCountRef.current = 1;
      setHasSignature(true);
      
      // Export as data URL
      const outputDataUrl = canvas.toDataURL("image/png");
      onSignatureChange(outputDataUrl);
    };
    img.src = dataUrl;
  };

  const drawPenPoint = (x: number, y: number, pressure: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = canvas.width / dprRef.current;
    const displayHeight = 200;
    
    // Scale Wacom coordinates (typically 0-396, 0-100 for STU-500) to canvas
    const canvasX = (x / 396) * displayWidth;
    const canvasY = (y / 100) * displayHeight;

    if (pressure > 0) {
      ctx.lineWidth = 1.5 + (pressure / 1024) * 2;
      ctx.strokeStyle = "#000000";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      const lastPen = penDataRef.current.length > 0 ? penDataRef.current[penDataRef.current.length - 1] : null;
      if (lastPen && lastPen.pressure > 0) {
        const lastX = (lastPen.x / 396) * displayWidth;
        const lastY = (lastPen.y / 100) * displayHeight;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(canvasX, canvasY);
        ctx.stroke();
      }
      
      penDataRef.current.push({ x, y, pressure });
      strokeCountRef.current = 1;
      setHasSignature(true);
    } else {
      penDataRef.current.push({ x, y, pressure: 0 });
    }
  };

  // Setup canvas with devicePixelRatio scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    const displayWidth = container.clientWidth;
    const displayHeight = 200;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    setupCanvas();

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tempDataUrl = strokeCountRef.current > 0 ? canvas.toDataURL("image/png") : null;

      setupCanvas();

      if (tempDataUrl) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width / dprRef.current, 200);
        };
        img.src = tempDataUrl;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  // Get coordinates relative to canvas
  const getPoint = useCallback((e: PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const pad = 2;
    return {
      x: Math.max(pad, Math.min(e.clientX - rect.left, rect.width - pad)),
      y: Math.max(pad, Math.min(e.clientY - rect.top, rect.height - pad)),
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }, []);

  const drawSegment = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.lineWidth = 1.5 + to.pressure * 1.5;
    ctx.quadraticCurveTo(from.x, from.y, midX, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX, midY);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      const pt = getPoint(e);
      lastPointRef.current = pt;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineWidth = 1.5 + pt.pressure * 1.5;
      ctx.lineTo(pt.x + 0.1, pt.y + 0.1);
      ctx.stroke();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pt = getPoint(e);
      const coalescedEvents = (e as any).getCoalescedEvents?.() as PointerEvent[] | undefined;
      if (coalescedEvents && coalescedEvents.length > 1) {
        for (const ce of coalescedEvents) {
          const cpt = getPoint(ce);
          if (lastPointRef.current) drawSegment(ctx, lastPointRef.current, cpt);
          lastPointRef.current = cpt;
        }
      } else {
        if (lastPointRef.current) drawSegment(ctx, lastPointRef.current, pt);
        lastPointRef.current = pt;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      canvas.releasePointerCapture(e.pointerId);
      isDrawingRef.current = false;
      lastPointRef.current = null;
      strokeCountRef.current += 1;
      setHasSignature(true);
      const dataUrl = canvas.toDataURL("image/png");
      onSignatureChange(dataUrl);
    };

    const onPointerLeave = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (!canvas.hasPointerCapture(e.pointerId)) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        if (strokeCountRef.current > 0) {
          const dataUrl = canvas.toDataURL("image/png");
          onSignatureChange(dataUrl);
        }
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [getPoint, drawSegment, onSignatureChange]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dprRef.current, dprRef.current);
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokeCountRef.current = 0;
    lastPointRef.current = null;
    isDrawingRef.current = false;
    penDataRef.current = [];
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pen className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Firma Digital</h3>
            {wacomStatus === 'connected' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Wacom STU Conectada
              </span>
            )}
            {wacomStatus === 'checking' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                Buscando tableta...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wacomStatus === 'connected' && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={startWacomCapture}
                disabled={wacomCapturing}
                data-testid="wacom-capture-btn"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {wacomCapturing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Capturando...
                  </>
                ) : (
                  <>
                    <Tablet className="h-4 w-4 mr-2" />
                    Firmar en Tableta
                  </>
                )}
              </Button>
            )}
            {wacomStatus === 'unavailable' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={checkWacomAvailability}
                className="text-xs"
              >
                <Tablet className="h-3 w-3 mr-1" />
                Reconectar Wacom
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              disabled={!hasSignature}
            >
              <Eraser className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="border-2 border-dashed border-muted rounded-lg bg-background relative overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ touchAction: "none" }}
          />
          {!hasSignature && !wacomCapturing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-sm">
                {wacomStatus === 'connected' 
                  ? 'Haga clic en "Firmar en Tableta" o firme aquí con mouse/lápiz'
                  : 'Firme aquí con su dedo, lápiz o mouse'}
              </p>
            </div>
          )}
          {wacomCapturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 pointer-events-none">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-blue-700 font-medium">Firme en la tableta Wacom...</p>
                <p className="text-blue-500 text-sm">Presione "Aceptar" en la tableta cuando termine</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          * La firma será guardada como parte del contrato y no podrá ser modificada posteriormente.
        </p>
      </div>
    </Card>
  );
};
