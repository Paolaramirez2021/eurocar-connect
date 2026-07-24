import { ChecklistSection } from "../ChecklistSection";
import type { CheckItem } from "../InspectionForm";

interface DocumentsTabProps {
  checkItems: CheckItem[];
  setCheckItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void;
}

const DOCUMENT_ITEMS = [
  "SOAT vigente", "Técnico-mecánica vigente", "Tarjeta de propiedad",
  "Licencia de tránsito", "Seguro todo riesgo", "Póliza contractual"
];

const SECURITY_ITEMS = [
  "Gato hidráulico", "Cruceta de ruedas", "Llanta de repuesto",
  "Triángulos reflectivos (2)", "Extintor vigente", "Botiquín",
  "Chaleco reflectivo", "Linterna", "Kit de herramientas",
  "Cable de batería", "Cinta de señalización"
];

export const DocumentsTab = ({ checkItems, setCheckItems }: DocumentsTabProps) => {
  return (
    <div className="space-y-4">
      <ChecklistSection
        title="Documentos del Vehículo"
        categoria="documentos"
        items={DOCUMENT_ITEMS}
        checkItems={checkItems}
        setCheckItems={setCheckItems}
      />
      <ChecklistSection
        title="Elementos de Seguridad y Herramientas"
        categoria="seguridad"
        items={SECURITY_ITEMS}
        checkItems={checkItems}
        setCheckItems={setCheckItems}
      />
    </div>
  );
};
