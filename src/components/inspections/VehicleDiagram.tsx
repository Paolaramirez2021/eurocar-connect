import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DamageItem } from "./InspectionForm";

interface VehicleDiagramProps {
  damages: DamageItem[];
  prevDamages: DamageItem[];
  onZoneClick: (zone: string, x: number, y: number) => void;
}

type ViewType = "frontal" | "trasera" | "lateral_izq" | "lateral_der" | "superior";

const VIEW_LABELS: Record<ViewType, string> = {
  frontal: "Frontal",
  trasera: "Trasera",
  lateral_izq: "Lateral Izquierdo",
  lateral_der: "Lateral Derecho",
  superior: "Superior",
};

export const VehicleDiagram = ({ damages, prevDamages, onZoneClick }: VehicleDiagramProps) => {
  const [activeView, setActiveView] = useState<ViewType>("frontal");

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onZoneClick(activeView, Math.round(x * 100) / 100, Math.round(y * 100) / 100);
  };

  const viewDamages = damages.filter(d => d.zona === activeView);
  const viewPrevDamages = prevDamages.filter(d => d.zona === activeView);

  const severityDotColor = (s: string) => {
    switch (s) {
      case "grave": return "#ef4444";
      case "moderado": return "#f59e0b";
      default: return "#eab308";
    }
  };

  return (
    <div className="space-y-3">
      {/* View Selector */}
      <div className="flex gap-1 justify-center flex-wrap">
        {(Object.keys(VIEW_LABELS) as ViewType[]).map((view) => {
          const count = damages.filter(d => d.zona === view).length;
          return (
            <Button
              key={view}
              size="sm"
              variant={activeView === view ? "default" : "outline"}
              onClick={() => setActiveView(view)}
              className="text-xs relative"
            >
              {VIEW_LABELS[view]}
              {count > 0 && (
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* SVG Diagram */}
      <div className="border rounded-xl bg-slate-50 p-4 flex justify-center">
        <svg
          viewBox="0 0 400 250"
          className="w-full max-w-lg cursor-crosshair"
          onClick={handleClick}
          data-testid="vehicle-diagram-svg"
        >
          {/* Vehicle shape based on view */}
          {activeView === "frontal" && <FrontalView />}
          {activeView === "trasera" && <TraseraView />}
          {activeView === "lateral_izq" && <LateralView flipped={false} />}
          {activeView === "lateral_der" && <LateralView flipped={true} />}
          {activeView === "superior" && <SuperiorView />}

          {/* Previous damage dots (amber, hollow) */}
          {viewPrevDamages.map((d, i) => (
            <g key={`prev-${i}`}>
              <circle
                cx={d.posicion_x * 4}
                cy={d.posicion_y * 2.5}
                r={8}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3,2"
              />
              <text
                x={d.posicion_x * 4}
                y={d.posicion_y * 2.5 + 3}
                textAnchor="middle"
                fontSize={8}
                fill="#f59e0b"
              >P</text>
            </g>
          ))}

          {/* Current damage dots */}
          {viewDamages.map((d, i) => (
            <g key={`dmg-${i}`}>
              <circle
                cx={d.posicion_x * 4}
                cy={d.posicion_y * 2.5}
                r={8}
                fill={severityDotColor(d.severidad)}
                opacity={0.8}
              />
              <circle
                cx={d.posicion_x * 4}
                cy={d.posicion_y * 2.5}
                r={10}
                fill="none"
                stroke={severityDotColor(d.severidad)}
                strokeWidth={1.5}
                className="animate-ping"
                opacity={0.3}
              />
              <text
                x={d.posicion_x * 4}
                y={d.posicion_y * 2.5 + 3}
                textAnchor="middle"
                fontSize={8}
                fill="white"
                fontWeight="bold"
              >{i + 1}</text>
            </g>
          ))}

          {/* Click instruction */}
          <text x={200} y={245} textAnchor="middle" fontSize={10} fill="#94a3b8" fontStyle="italic">
            Haga clic en el área donde se encuentra el daño
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Leve
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Moderado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Grave
        </span>
        {prevDamages.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-amber-400 inline-block" /> Previo
          </span>
        )}
      </div>
    </div>
  );
};

/* SVG View Components */
const FrontalView = () => (
  <g>
    {/* Car body */}
    <rect x={100} y={40} width={200} height={160} rx={20} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
    {/* Windshield */}
    <rect x={130} y={50} width={140} height={50} rx={8} fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    {/* Headlights */}
    <ellipse cx={120} cy={130} rx={15} ry={20} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1.5} />
    <ellipse cx={280} cy={130} rx={15} ry={20} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1.5} />
    {/* Grille */}
    <rect x={150} y={120} width={100} height={30} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    <line x1={175} y1={120} x2={175} y2={150} stroke="#94a3b8" strokeWidth={0.5} />
    <line x1={200} y1={120} x2={200} y2={150} stroke="#94a3b8" strokeWidth={0.5} />
    <line x1={225} y1={120} x2={225} y2={150} stroke="#94a3b8" strokeWidth={0.5} />
    {/* Bumper */}
    <rect x={110} y={160} width={180} height={20} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    {/* License plate */}
    <rect x={165} y={163} width={70} height={14} rx={2} fill="white" stroke="#64748b" strokeWidth={1} />
    {/* Mirrors */}
    <rect x={88} y={70} width={12} height={25} rx={3} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
    <rect x={300} y={70} width={12} height={25} rx={3} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
    {/* Label */}
    <text x={200} y={30} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="600">VISTA FRONTAL</text>
  </g>
);

const TraseraView = () => (
  <g>
    <rect x={100} y={40} width={200} height={160} rx={20} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
    {/* Rear windshield */}
    <rect x={130} y={50} width={140} height={45} rx={8} fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    {/* Taillights */}
    <rect x={105} y={120} width={25} height={40} rx={5} fill="#fecaca" stroke="#ef4444" strokeWidth={1.5} />
    <rect x={270} y={120} width={25} height={40} rx={5} fill="#fecaca" stroke="#ef4444" strokeWidth={1.5} />
    {/* Trunk */}
    <rect x={140} y={100} width={120} height={60} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    {/* Bumper */}
    <rect x={110} y={170} width={180} height={15} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    {/* License plate */}
    <rect x={165} y={130} width={70} height={14} rx={2} fill="white" stroke="#64748b" strokeWidth={1} />
    {/* Exhaust */}
    <ellipse cx={150} cy={192} rx={10} ry={5} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
    <text x={200} y={30} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="600">VISTA TRASERA</text>
  </g>
);

const LateralView = ({ flipped }: { flipped: boolean }) => (
  <g transform={flipped ? "translate(400,0) scale(-1,1)" : ""}>
    {/* Body */}
    <path
      d="M 60 150 L 60 100 Q 60 80 80 80 L 120 80 L 150 50 Q 155 45 165 45 L 250 45 Q 260 45 265 50 L 290 80 L 340 80 Q 350 80 350 100 L 350 150"
      fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2}
    />
    {/* Windows */}
    <path d="M 155 50 L 125 80 L 195 80 L 195 50 Z" fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    <path d="M 200 50 L 200 80 L 280 80 L 260 50 Z" fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    {/* Door line */}
    <line x1={195} y1={50} x2={195} y2={145} stroke="#94a3b8" strokeWidth={1} />
    {/* Door handles */}
    <rect x={170} y={100} width={15} height={4} rx={2} fill="#94a3b8" />
    <rect x={220} y={100} width={15} height={4} rx={2} fill="#94a3b8" />
    {/* Wheels */}
    <circle cx={110} cy={155} r={25} fill="#475569" stroke="#334155" strokeWidth={2} />
    <circle cx={110} cy={155} r={10} fill="#94a3b8" />
    <circle cx={300} cy={155} r={25} fill="#475569" stroke="#334155" strokeWidth={2} />
    <circle cx={300} cy={155} r={10} fill="#94a3b8" />
    {/* Bumpers */}
    <rect x={45} y={120} width={15} height={30} rx={3} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    <rect x={350} y={120} width={15} height={30} rx={3} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    {/* Headlight / taillight */}
    <rect x={50} y={95} width={12} height={20} rx={3} fill="#fef3c7" stroke="#f59e0b" strokeWidth={1} />
    <rect x={348} y={95} width={12} height={20} rx={3} fill="#fecaca" stroke="#ef4444" strokeWidth={1} />
    <text x={200} y={30} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="600">
      {flipped ? "LATERAL DERECHO" : "LATERAL IZQUIERDO"}
    </text>
  </g>
);

const SuperiorView = () => (
  <g>
    {/* Body outline */}
    <rect x={120} y={20} width={160} height={210} rx={30} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
    {/* Windshields */}
    <rect x={145} y={35} width={110} height={40} rx={8} fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    <rect x={145} y={170} width={110} height={35} rx={8} fill="#bfdbfe" stroke="#60a5fa" strokeWidth={1.5} />
    {/* Roof */}
    <rect x={150} y={80} width={100} height={85} rx={5} fill="#cbd5e1" stroke="#94a3b8" strokeWidth={1} />
    {/* Wheels */}
    <rect x={105} y={50} width={15} height={35} rx={5} fill="#475569" />
    <rect x={280} y={50} width={15} height={35} rx={5} fill="#475569" />
    <rect x={105} y={160} width={15} height={35} rx={5} fill="#475569" />
    <rect x={280} y={160} width={15} height={35} rx={5} fill="#475569" />
    {/* Mirrors */}
    <ellipse cx={112} cy={95} rx={8} ry={5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
    <ellipse cx={288} cy={95} rx={8} ry={5} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
    {/* Direction arrow */}
    <polygon points="200,25 195,35 205,35" fill="#94a3b8" />
    <text x={200} y={15} textAnchor="middle" fontSize={12} fill="#475569" fontWeight="600">VISTA SUPERIOR</text>
  </g>
);
