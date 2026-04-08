import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eraser, Pen } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
}

export const SignatureCanvas = ({ onSignatureChange }: SignatureCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const strokeCountRef = useRef(0);
  const [hasSignature, setHasSignature] = useState(false);
  const dprRef = useRef(window.devicePixelRatio || 1);

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

    // Scale canvas buffer for high-DPI
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);

    // Drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    setupCanvas();

    const handleResize = () => {
      // Save current signature data before resize
      const canvas = canvasRef.current;
      if (!canvas) return;
      const tempDataUrl = strokeCountRef.current > 0 ? canvas.toDataURL("image/png") : null;

      setupCanvas();

      // Restore signature after resize if there was one
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

  // Get coordinates relative to canvas, accounting for DPR
  const getPoint = useCallback((e: PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }, []);

  // Draw smooth quadratic bezier between points
  const drawSegment = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point) => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Vary line width slightly with pressure (1.5 - 3px range)
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
      // Capture pointer for reliable tracking even outside canvas
      canvas.setPointerCapture(e.pointerId);

      isDrawingRef.current = true;
      const pt = getPoint(e);
      lastPointRef.current = pt;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      // Draw a dot for single taps
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

      // Use coalesced events for smoother stylus input
      const coalescedEvents = (e as any).getCoalescedEvents?.() as PointerEvent[] | undefined;
      if (coalescedEvents && coalescedEvents.length > 1) {
        for (const ce of coalescedEvents) {
          const cpt = getPoint(ce);
          if (lastPointRef.current) {
            drawSegment(ctx, lastPointRef.current, cpt);
          }
          lastPointRef.current = cpt;
        }
      } else {
        if (lastPointRef.current) {
          drawSegment(ctx, lastPointRef.current, pt);
        }
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

      // Export signature
      const dataUrl = canvas.toDataURL("image/png");
      onSignatureChange(dataUrl);
    };

    const onPointerLeave = (e: PointerEvent) => {
      // Only stop if pointer is NOT captured (captured continues outside)
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

    // Pointer events cover mouse + touch + stylus
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

    // Reset transform, clear, re-apply DPR scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dprRef.current, dprRef.current);
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokeCountRef.current = 0;
    lastPointRef.current = null;
    isDrawingRef.current = false;
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
          </div>
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

        <div className="border-2 border-dashed border-muted rounded-lg bg-background relative overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ touchAction: "none" }}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-sm">
                Firme aquí con su dedo, lápiz o mouse
              </p>
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
