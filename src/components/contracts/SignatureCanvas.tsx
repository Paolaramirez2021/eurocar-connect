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

// Declare global WacomGSS type
declare const WacomGSS: any;

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

  // Wacom state refs (to avoid re-renders during capture)
  const wacomTabletRef = useRef<any>(null);
  const wacomCapabilityRef = useRef<any>(null);
  const wacomInkThresholdRef = useRef<any>(null);
  const wacomEncodingModeRef = useRef<any>(null);
  const wacomPenDataRef = useRef<any[]>([]);
  const wacomBtnsRef = useRef<any[]>([]);
  const wacomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wacomCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const wacomModalRef = useRef<HTMLDivElement | null>(null);
  const wacomFormRef = useRef<HTMLDivElement | null>(null);
  const wacomIsDownRef = useRef(false);
  const wacomLastPointRef = useRef({ x: 0, y: 0 });
  const wacomClickBtnRef = useRef(-1);
  const wacomImgDataRef = useRef<any>(null);

  // Check if Wacom SigCaptX SDK is loaded (the actual connection happens when user clicks)
  useEffect(() => {
    let retries = 0;
    const maxRetries = 15;

    const checkService = () => {
      try {
        if (typeof WacomGSS !== 'undefined' && WacomGSS.STU) {
          // SDK is loaded. Check if service is ready
          if (WacomGSS.STU.isServiceReady()) {
            console.log('[Wacom] SigCaptX servicio listo');
            setWacomStatus('connected');
            return;
          }
          // SDK loaded but service not ready yet - keep trying
          console.log('[Wacom] SDK cargado, esperando servicio... intento', retries);
        }
      } catch (e) {
        console.log('[Wacom] Error checking:', e);
      }
      retries++;
      if (retries < maxRetries) {
        setTimeout(checkService, 1500);
      } else {
        // If SDK is loaded, show the button anyway - connection will be attempted on click
        if (typeof WacomGSS !== 'undefined' && WacomGSS.STU) {
          console.log('[Wacom] SDK cargado pero servicio no responde. Botón disponible para intentar.');
          setWacomStatus('connected');
        } else {
          console.log('[Wacom] SDK no cargado');
          setWacomStatus('unavailable');
        }
      }
    };

    setTimeout(checkService, 1000);
  }, []);

  // ==================== WACOM STU CAPTURE ====================
  const startWacomCapture = useCallback(() => {
    if (typeof WacomGSS === 'undefined' || !WacomGSS.STU) {
      alert('El SDK de Wacom no está cargado. Asegúrese de tener instalado Wacom STU SigCaptX.');
      setWacomStatus('unavailable');
      return;
    }

    setWacomCapturing(true);
    wacomPenDataRef.current = [];

    // Reinicializar el WebSocket del SDK antes de cada captura
    // Esto asegura una conexión fresca al SigCaptX
    if (!WacomGSS.STU.isServiceReady()) {
      console.log('[Wacom] Servicio no conectado, reinicializando...');
      WacomGSS.STU.Reinitialize();
      
      // Esperar a que el WebSocket se conecte
      let wsRetries = 0;
      const waitForWs = () => {
        wsRetries++;
        if (WacomGSS.STU.isServiceReady()) {
          console.log('[Wacom] WebSocket conectado tras reinicialización');
          doWacomCapture();
        } else if (wsRetries < 10) {
          setTimeout(waitForWs, 500);
        } else {
          setWacomCapturing(false);
          alert('No se pudo conectar con Wacom SigCaptX.\n\nVerifique que:\n1. Wacom STU SigCaptX esté instalado y corriendo\n2. La tableta STU-500 esté conectada por USB\n3. En Chrome, visite chrome://flags/#allow-insecure-localhost y active la opción');
        }
      };
      setTimeout(waitForWs, 500);
    } else {
      doWacomCapture();
    }
  }, []);

  const doWacomCapture = useCallback(() => {

    const p = new WacomGSS.STU.Protocol();
    let intf: any;
    let m_usbDevices: any;

    WacomGSS.STU.isDCAReady()
      .then((message: boolean) => {
        if (!message) throw new Error('DCA not ready');
        WacomGSS.STU.onDCAtimeout = () => {
          console.log('[Wacom] DCA timeout');
          wacomClose();
        };
        return WacomGSS.STU.getUsbDevices();
      })
      .then((devices: any[]) => {
        if (!devices || devices.length === 0) throw new Error('No se encontró tableta Wacom STU');
        m_usbDevices = devices;
        console.log('[Wacom] Dispositivo encontrado:', JSON.stringify(devices[0]));
        return WacomGSS.STU.isSupportedUsbDevice(devices[0].idVendor, devices[0].idProduct);
      })
      .then(() => {
        intf = new WacomGSS.STU.UsbInterface();
        return intf.Constructor();
      })
      .then(() => intf.connect(m_usbDevices[0], true))
      .then(() => {
        const tablet = new WacomGSS.STU.Tablet();
        wacomTabletRef.current = tablet;
        return tablet.Constructor(intf, null, null);
      })
      .then(() => {
        intf = null;
        return wacomTabletRef.current.getInkThreshold();
      })
      .then((threshold: any) => {
        wacomInkThresholdRef.current = threshold;
        return wacomTabletRef.current.getCapability();
      })
      .then((cap: any) => {
        wacomCapabilityRef.current = cap;
        console.log('[Wacom] Pantalla:', cap.screenWidth, 'x', cap.screenHeight);

        // Create modal window for signature capture
        createWacomModal(cap.screenWidth, cap.screenHeight);
        return wacomTabletRef.current.getInformation();
      })
      .then(() => wacomTabletRef.current.getProductId())
      .then((productId: number) => {
        return WacomGSS.STU.ProtocolHelper.simulateEncodingFlag(productId, wacomCapabilityRef.current.encodingFlag);
      })
      .then((encodingFlag: number) => {
        if ((encodingFlag & p.EncodingFlag.EncodingFlag_24bit) !== 0) {
          return wacomTabletRef.current.supportsWrite().then((sw: boolean) => {
            wacomEncodingModeRef.current = sw ? p.EncodingMode.EncodingMode_24bit_Bulk : p.EncodingMode.EncodingMode_24bit;
          });
        } else if ((encodingFlag & p.EncodingFlag.EncodingFlag_16bit) !== 0) {
          return wacomTabletRef.current.supportsWrite().then((sw: boolean) => {
            wacomEncodingModeRef.current = sw ? p.EncodingMode.EncodingMode_16bit_Bulk : p.EncodingMode.EncodingMode_16bit;
          });
        } else {
          wacomEncodingModeRef.current = p.EncodingMode.EncodingMode_1bit;
        }
      })
      .then(() => wacomTabletRef.current.setClearScreen())
      .then(() => wacomTabletRef.current.isSupported(p.ReportId.ReportId_PenDataOptionMode))
      .then((supported: boolean) => {
        if (supported) {
          return wacomTabletRef.current.getProductId().then((pid: number) => {
            let mode = p.PenDataOptionMode.PenDataOptionMode_None;
            switch (pid) {
              case WacomGSS.STU.ProductId.ProductId_520A:
                mode = p.PenDataOptionMode.PenDataOptionMode_TimeCount; break;
              case WacomGSS.STU.ProductId.ProductId_430:
              case WacomGSS.STU.ProductId.ProductId_530:
              case WacomGSS.STU.ProductId.ProductId_540:
                mode = p.PenDataOptionMode.PenDataOptionMode_TimeCountSequence; break;
            }
            return wacomTabletRef.current.setPenDataOptionMode(mode);
          });
        }
      })
      .then(() => {
        // Add buttons to the modal canvas and send to tablet
        addWacomButtons();
        const wacomCanvas = wacomCanvasRef.current!;
        const canvasImage = wacomCanvas.toDataURL("image/jpeg");
        return WacomGSS.STU.ProtocolHelper.resizeAndFlatten(
          canvasImage, 0, 0, 0, 0,
          wacomCapabilityRef.current.screenWidth,
          wacomCapabilityRef.current.screenHeight,
          wacomEncodingModeRef.current, 1, false, 0, true
        );
      })
      .then((imgData: any) => {
        wacomImgDataRef.current = imgData;
        return wacomTabletRef.current.writeImage(wacomEncodingModeRef.current, imgData);
      })
      .then(() => wacomTabletRef.current.setInkingMode(p.InkingMode.InkingMode_On))
      .then(() => {
        // Setup pen data handler
        const reportHandler = new WacomGSS.STU.ProtocolHelper.ReportHandler();
        wacomLastPointRef.current = { x: 0, y: 0 };
        wacomIsDownRef.current = false;
        wacomCtxRef.current!.lineWidth = 1;

        const penDataHandler = (report: any) => {
          processWacomButtons(report);
          processWacomPoint(report);
          wacomPenDataRef.current.push(report);
        };
        const penDataEncHandler = (report: any) => {
          processWacomButtons(report.penData[0]);
          processWacomPoint(report.penData[0]);
          processWacomButtons(report.penData[1]);
          processWacomPoint(report.penData[1]);
          wacomPenDataRef.current.push(report.penData[0], report.penData[1]);
        };

        reportHandler.onReportPenData = penDataHandler;
        reportHandler.onReportPenDataOption = penDataHandler;
        reportHandler.onReportPenDataTimeCountSequence = penDataHandler;
        reportHandler.onReportPenDataEncrypted = penDataEncHandler;
        reportHandler.onReportPenDataEncryptedOption = penDataEncHandler;
        reportHandler.onReportPenDataTimeCountSequenceEncrypted = penDataHandler;
        reportHandler.onReportDevicePublicKey = () => {};
        reportHandler.onReportEncryptionStatus = () => {};
        reportHandler.decrypt = () => {};

        return reportHandler.startReporting(wacomTabletRef.current, true);
      })
      .fail((ex: any) => {
        console.error('[Wacom] Error:', ex);
        setWacomCapturing(false);
        if (ex.message?.includes('DCA')) {
          WacomGSS.STU.Reinitialize();
        } else {
          alert('Error con tableta Wacom: ' + (ex.message || ex));
        }
        wacomClose();
      });
  }, []);

  // Create modal window for Wacom signature capture
  const createWacomModal = (width: number, height: number) => {
    const bg = document.createElement('div');
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;';
    document.body.appendChild(bg);
    wacomModalRef.current = bg;

    const form = document.createElement('div');
    form.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10001;background:white;border-radius:8px;padding:0;box-shadow:0 25px 50px rgba(0,0,0,0.25);`;
    form.style.width = width + 'px';
    form.style.height = height + 'px';
    document.body.appendChild(form);
    wacomFormRef.current = form;

    const wCanvas = document.createElement('canvas');
    wCanvas.width = width;
    wCanvas.height = height;
    wCanvas.style.cursor = 'crosshair';
    form.appendChild(wCanvas);
    wacomCanvasRef.current = wCanvas;
    wacomCtxRef.current = wCanvas.getContext('2d');

    // Handle mouse clicks on simulated buttons
    wCanvas.addEventListener('click', (e) => {
      const rect = form.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      for (let i = 0; i < wacomBtnsRef.current.length; i++) {
        const b = wacomBtnsRef.current[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          b.click();
          break;
        }
      }
    });
  };

  // Add OK/Clear/Cancel buttons to Wacom canvas
  const addWacomButtons = () => {
    const cap = wacomCapabilityRef.current;
    const w1 = Math.floor(cap.screenWidth / 3);
    const w2 = Math.floor(cap.screenWidth / 3);
    const w3 = cap.screenWidth - w1 - w2;
    const y = Math.floor(cap.screenHeight * 6 / 7);
    const h = cap.screenHeight - y;

    wacomBtnsRef.current = [
      { x: 0, y, w: w1, h, text: 'OK', click: wacomOk },
      { x: w1, y, w: w2, h, text: 'Limpiar', click: wacomClear },
      { x: w1 + w2, y, w: w3, h, text: 'Cancelar', click: wacomCancel },
    ];

    // Draw buttons on canvas
    const ctx = wacomCtxRef.current!;
    const wCanvas = wacomCanvasRef.current!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, wCanvas.width, wCanvas.height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.font = '24px Arial';

    for (const btn of wacomBtnsRef.current) {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.fillStyle = 'black';
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
      const txtW = ctx.measureText(btn.text).width;
      ctx.fillText(btn.text, btn.x + (btn.w - txtW) / 2, btn.y + 32);
    }
    ctx.strokeStyle = 'black';
  };

  // Wacom button handlers
  const wacomOk = () => {
    generateWacomSignatureImage();
    wacomClose();
  };

  const wacomCancel = () => {
    wacomClose();
  };

  const wacomClear = () => {
    wacomPenDataRef.current = [];
    const ctx = wacomCtxRef.current;
    const wCanvas = wacomCanvasRef.current;
    if (ctx && wCanvas) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, wCanvas.width, wCanvas.height);
      addWacomButtons();
      // Resend canvas to tablet
      if (wacomTabletRef.current && wacomImgDataRef.current) {
        wacomTabletRef.current.writeImage(wacomEncodingModeRef.current, wacomImgDataRef.current);
      }
    }
  };

  // Generate signature image from pen data and pass to main canvas
  const generateWacomSignatureImage = () => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) return;

    // Create temp canvas to render signature at proper size
    const sigCanvas = document.createElement('canvas');
    const cap = wacomCapabilityRef.current;
    sigCanvas.width = cap.screenWidth;
    sigCanvas.height = cap.screenHeight;
    const sigCtx = sigCanvas.getContext('2d')!;
    sigCtx.fillStyle = 'white';
    sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigCtx.lineWidth = 1;
    sigCtx.strokeStyle = 'black';

    let lastPt = { x: 0, y: 0 };
    let isDown = false;

    for (const pt of wacomPenDataRef.current) {
      const nx = Math.round(sigCanvas.width * pt.x / cap.tabletMaxX);
      const ny = Math.round(sigCanvas.height * pt.y / cap.tabletMaxY);
      const threshold = wacomInkThresholdRef.current;
      const isDown2 = isDown
        ? !(pt.pressure <= threshold.offPressureMark)
        : (pt.pressure > threshold.onPressureMark);

      if (!isDown && isDown2) lastPt = { x: nx, y: ny };
      const dist = Math.pow(lastPt.x - nx, 2) + Math.pow(lastPt.y - ny, 2);
      if ((isDown2 && dist > 10) || (isDown && !isDown2)) {
        sigCtx.beginPath();
        sigCtx.moveTo(lastPt.x, lastPt.y);
        sigCtx.lineTo(nx, ny);
        sigCtx.stroke();
        sigCtx.closePath();
        lastPt = { x: nx, y: ny };
      }
      isDown = isDown2;
    }

    // Draw on main component canvas
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.scale(dprRef.current, dprRef.current);

    const displayW = mainCanvas.width / dprRef.current;
    const displayH = 200;
    const scale = Math.min(displayW / sigCanvas.width, displayH / sigCanvas.height) * 0.9;
    const x = (displayW - sigCanvas.width * scale) / 2;
    const y = (displayH - sigCanvas.height * scale) / 2;
    mainCtx.drawImage(sigCanvas, x, y, sigCanvas.width * scale, sigCanvas.height * scale);

    strokeCountRef.current = 1;
    setHasSignature(true);
    onSignatureChange(mainCanvas.toDataURL('image/png'));
  };

  // Process pen data for button clicks
  const processWacomButtons = (point: any) => {
    const cap = wacomCapabilityRef.current;
    const wCanvas = wacomCanvasRef.current!;
    const nx = Math.round(wCanvas.width * point.x / cap.tabletMaxX);
    const ny = Math.round(wCanvas.height * point.y / cap.tabletMaxY);
    const threshold = wacomInkThresholdRef.current;
    const isDown2 = wacomIsDownRef.current
      ? !(point.pressure <= threshold.offPressureMark)
      : (point.pressure > threshold.onPressureMark);

    let btn = -1;
    for (let i = 0; i < wacomBtnsRef.current.length; i++) {
      const b = wacomBtnsRef.current[i];
      if (nx >= b.x && nx <= b.x + b.w && ny >= b.y && ny <= b.y + b.h) {
        btn = i; break;
      }
    }

    if (wacomIsDownRef.current && !isDown2) {
      if (btn !== -1 && wacomClickBtnRef.current === btn) {
        wacomBtnsRef.current[btn].click();
      }
      wacomClickBtnRef.current = -1;
    } else if (btn !== -1 && !wacomIsDownRef.current && isDown2) {
      wacomClickBtnRef.current = btn;
    }
  };

  // Process pen data for drawing
  const processWacomPoint = (point: any) => {
    const cap = wacomCapabilityRef.current;
    const wCanvas = wacomCanvasRef.current;
    const ctx = wacomCtxRef.current;
    if (!wCanvas || !ctx) return;

    const nx = Math.round(wCanvas.width * point.x / cap.tabletMaxX);
    const ny = Math.round(wCanvas.height * point.y / cap.tabletMaxY);
    const threshold = wacomInkThresholdRef.current;
    const isDown2 = wacomIsDownRef.current
      ? !(point.pressure <= threshold.offPressureMark)
      : (point.pressure > threshold.onPressureMark);

    if (!wacomIsDownRef.current && isDown2) {
      wacomLastPointRef.current = { x: nx, y: ny };
    }

    const dist = Math.pow(wacomLastPointRef.current.x - nx, 2) + Math.pow(wacomLastPointRef.current.y - ny, 2);
    if ((isDown2 && dist > 10) || (wacomIsDownRef.current && !isDown2)) {
      ctx.beginPath();
      ctx.moveTo(wacomLastPointRef.current.x, wacomLastPointRef.current.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.closePath();
      wacomLastPointRef.current = { x: nx, y: ny };
    }
    wacomIsDownRef.current = isDown2;
  };

  // Close Wacom session and cleanup
  const wacomClose = () => {
    WacomGSS.STU.onDCAtimeout = null;

    const tablet = wacomTabletRef.current;
    if (tablet) {
      const p = new WacomGSS.STU.Protocol();
      tablet.setInkingMode(p.InkingMode.InkingMode_Off)
        .then(() => tablet.endCapture())
        .then(() => {
          if (wacomImgDataRef.current) return wacomImgDataRef.current.remove();
        })
        .then(() => { wacomImgDataRef.current = null; return tablet.setClearScreen(); })
        .then(() => tablet.disconnect())
        .then(() => { wacomTabletRef.current = null; })
        .fail((e: any) => console.error('[Wacom] disconnect error:', e));
    }

    // Remove modal
    if (wacomModalRef.current) {
      document.body.removeChild(wacomModalRef.current);
      wacomModalRef.current = null;
    }
    if (wacomFormRef.current) {
      document.body.removeChild(wacomFormRef.current);
      wacomFormRef.current = null;
    }
    wacomCanvasRef.current = null;
    wacomCtxRef.current = null;
    setWacomCapturing(false);
  };

  // ==================== MANUAL CANVAS (fallback) ====================
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
        img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width / dprRef.current, 200); };
        img.src = tempDataUrl;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

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
      onSignatureChange(canvas.toDataURL("image/png"));
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (!canvas.hasPointerCapture(e.pointerId)) {
        isDrawingRef.current = false;
        lastPointRef.current = null;
        if (strokeCountRef.current > 0) onSignatureChange(canvas.toDataURL("image/png"));
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
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando tableta...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {wacomStatus === 'connected' && !wacomCapturing && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={startWacomCapture}
                data-testid="wacom-capture-btn"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Tablet className="h-4 w-4 mr-2" />
                Firmar en Tableta
              </Button>
            )}
            {wacomStatus === 'unavailable' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setWacomStatus('checking'); setTimeout(() => {
                  try {
                    if (typeof WacomGSS !== 'undefined' && WacomGSS.STU.isServiceReady()) {
                      setWacomStatus('connected');
                    } else { setWacomStatus('unavailable'); }
                  } catch { setWacomStatus('unavailable'); }
                }, 1000); }}
                className="text-xs"
              >
                <Tablet className="h-3 w-3 mr-1" />
                Reconectar Wacom
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={clearSignature} disabled={!hasSignature}>
              <Eraser className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="border-2 border-dashed border-muted rounded-lg bg-background relative overflow-hidden touch-none">
          <canvas ref={canvasRef} className="w-full cursor-crosshair" style={{ touchAction: "none" }} />
          {!hasSignature && !wacomCapturing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground text-sm">
                {wacomStatus === 'connected'
                  ? 'Haga clic en "Firmar en Tableta" o firme aquí con mouse'
                  : 'Firme aquí con su dedo, lápiz o mouse'}
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
