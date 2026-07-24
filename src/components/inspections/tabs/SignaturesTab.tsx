import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PenTool, Trash2, CheckCircle } from "lucide-react";
import type { SignatureItem } from "../InspectionForm";

interface SignaturesTabProps {
  signatures: SignatureItem[];
  setSignatures: (fn: (prev: SignatureItem[]) => SignatureItem[]) => void;
  customerName: string;
  customerDoc: string;
  inspectorName: string;
}

const SignaturePad = ({ onSave, label }: { onSave: (data: string) => void; label: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const save = () => {
    if (!hasContent) return;
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onSave(dataUrl);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={clear}>
          <Trash2 className="h-3 w-3 mr-1" /> Limpiar
        </Button>
        <Button size="sm" onClick={save} disabled={!hasContent}>
          <CheckCircle className="h-3 w-3 mr-1" /> Guardar Firma
        </Button>
      </div>
    </div>
  );
};

export const SignaturesTab = ({ signatures, setSignatures, customerName, customerDoc, inspectorName }: SignaturesTabProps) => {
  const [clientName, setClientName] = useState(customerName);
  const [clientDoc, setClientDoc] = useState(customerDoc);
  const [inspName, setInspName] = useState(inspectorName);

  useEffect(() => { setClientName(customerName); }, [customerName]);
  useEffect(() => { setClientDoc(customerDoc); }, [customerDoc]);
  useEffect(() => { setInspName(inspectorName); }, [inspectorName]);

  const addSignature = (tipo: string, nombre: string, documento: string, firmaData: string) => {
    setSignatures(prev => {
      const filtered = prev.filter(s => s.tipo !== tipo);
      return [...filtered, { tipo, nombre_firmante: nombre, documento_firmante: documento, firma_data: firmaData }];
    });
  };

  const clientSig = signatures.find(s => s.tipo === "cliente");
  const inspSig = signatures.find(s => s.tipo === "inspector");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Client Signature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="h-4 w-4 text-primary" />
            Firma del Cliente
            {clientSig && <Badge className="bg-green-600 text-white ml-2">Firmado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input size={1} value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Documento</Label>
              <Input size={1} value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          {clientSig ? (
            <div className="space-y-2">
              <img src={clientSig.firma_data} alt="Firma cliente" className="border rounded w-full h-24 object-contain bg-white" />
              <Button size="sm" variant="outline" onClick={() => setSignatures(prev => prev.filter(s => s.tipo !== "cliente"))}>
                <Trash2 className="h-3 w-3 mr-1" /> Volver a firmar
              </Button>
            </div>
          ) : (
            <SignaturePad
              label="Firme aquí"
              onSave={(data) => addSignature("cliente", clientName, clientDoc, data)}
            />
          )}
        </CardContent>
      </Card>

      {/* Inspector Signature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="h-4 w-4 text-blue-500" />
            Firma del Inspector
            {inspSig && <Badge className="bg-green-600 text-white ml-2">Firmado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre del Inspector</Label>
            <Input size={1} value={inspName} onChange={(e) => setInspName(e.target.value)} className="h-8 text-sm" />
          </div>
          {inspSig ? (
            <div className="space-y-2">
              <img src={inspSig.firma_data} alt="Firma inspector" className="border rounded w-full h-24 object-contain bg-white" />
              <Button size="sm" variant="outline" onClick={() => setSignatures(prev => prev.filter(s => s.tipo !== "inspector"))}>
                <Trash2 className="h-3 w-3 mr-1" /> Volver a firmar
              </Button>
            </div>
          ) : (
            <SignaturePad
              label="Firme aquí"
              onSave={(data) => addSignature("inspector", inspName, "", data)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
