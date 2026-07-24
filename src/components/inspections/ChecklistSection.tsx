import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, ClipboardList } from "lucide-react";
import type { CheckItem } from "./InspectionForm";

interface ChecklistSectionProps {
  title: string;
  categoria: string;
  items: string[];
  checkItems: CheckItem[];
  setCheckItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void;
}

const STATUS_OPTIONS = [
  { value: "ok", label: "OK", icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100" },
  { value: "dañado", label: "Dañado", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { value: "faltante", label: "Faltante", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100" },
  { value: "no_aplica", label: "N/A", icon: MinusCircle, color: "text-slate-400 bg-slate-50 border-slate-200 hover:bg-slate-100" },
];

export const ChecklistSection = ({ title, categoria, items, checkItems, setCheckItems }: ChecklistSectionProps) => {
  // Initialize items if not present
  useEffect(() => {
    const existingNames = checkItems.filter(i => i.categoria === categoria).map(i => i.nombre);
    const missing = items.filter(name => !existingNames.includes(name));
    if (missing.length > 0) {
      const newItems: CheckItem[] = missing.map(nombre => ({
        categoria,
        nombre,
        estado: "ok",
        observaciones: "",
      }));
      setCheckItems(prev => [...prev, ...newItems]);
    }
  }, []);

  const getItemState = (nombre: string): string => {
    const item = checkItems.find(i => i.categoria === categoria && i.nombre === nombre);
    return item?.estado || "ok";
  };

  const setItemState = (nombre: string, estado: string) => {
    setCheckItems(prev => {
      const idx = prev.findIndex(i => i.categoria === categoria && i.nombre === nombre);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], estado };
        return updated;
      }
      return [...prev, { categoria, nombre, estado, observaciones: "" }];
    });
  };

  const getItemObs = (nombre: string): string => {
    return checkItems.find(i => i.categoria === categoria && i.nombre === nombre)?.observaciones || "";
  };

  const setItemObs = (nombre: string, obs: string) => {
    setCheckItems(prev => {
      const idx = prev.findIndex(i => i.categoria === categoria && i.nombre === nombre);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], observaciones: obs };
        return updated;
      }
      return prev;
    });
  };

  const catItems = checkItems.filter(i => i.categoria === categoria);
  const okCount = catItems.filter(i => i.estado === "ok").length;
  const issueCount = catItems.filter(i => i.estado !== "ok" && i.estado !== "no_aplica").length;

  // Set all to OK
  const setAllOk = () => {
    setCheckItems(prev =>
      prev.map(item =>
        item.categoria === categoria ? { ...item, estado: "ok" } : item
      )
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-green-600">{okCount} OK</Badge>
            {issueCount > 0 && <Badge variant="outline" className="text-xs text-red-600">{issueCount} novedad</Badge>}
            <Button size="sm" variant="ghost" onClick={setAllOk} className="text-xs h-7">
              Todo OK
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((itemName) => {
            const currentState = getItemState(itemName);
            const showObs = currentState === "dañado" || currentState === "faltante";
            return (
              <div key={itemName} className="flex items-center gap-2 py-1.5 border-b border-muted/50 last:border-0">
                <span className="text-sm flex-1 min-w-0 truncate">{itemName}</span>
                <div className="flex gap-1 flex-shrink-0">
                  {STATUS_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isActive = currentState === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setItemState(itemName, opt.value)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${
                          isActive ? opt.color + " font-medium" : "text-muted-foreground border-transparent hover:border-muted"
                        }`}
                        title={opt.label}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {showObs && (
                  <Input
                    placeholder="Observación..."
                    value={getItemObs(itemName)}
                    onChange={(e) => setItemObs(itemName, e.target.value)}
                    className="h-7 text-xs w-40 flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
