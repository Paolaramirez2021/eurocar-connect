import { ChecklistSection } from "../ChecklistSection";
import type { CheckItem } from "../InspectionForm";

interface MechanicaTabProps {
  checkItems: CheckItem[];
  setCheckItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void;
}

const MECANICA_ITEMS = [
  "Motor (sonido/funcionamiento)", "Batería", "Frenos",
  "Dirección", "Suspensión", "Transmisión",
  "Aceite del motor", "Líquido de frenos", "Refrigerante",
  "Líquido limpiaparabrisas", "Correas", "Filtro de aire",
  "Sistema de escape", "Embrague (si aplica)", "Arranque",
  "Luces tablero (check engine, etc.)"
];

export const MechanicaTab = ({ checkItems, setCheckItems }: MechanicaTabProps) => {
  return (
    <ChecklistSection
      title="Checklist Mecánica"
      categoria="mecanica"
      items={MECANICA_ITEMS}
      checkItems={checkItems}
      setCheckItems={setCheckItems}
    />
  );
};
