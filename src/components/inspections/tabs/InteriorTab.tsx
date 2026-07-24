import { ChecklistSection } from "../ChecklistSection";
import type { CheckItem } from "../InspectionForm";

interface InteriorTabProps {
  checkItems: CheckItem[];
  setCheckItems: (fn: (prev: CheckItem[]) => CheckItem[]) => void;
}

const INTERIOR_ITEMS = [
  "Tablero/Dashboard", "Volante", "Palanca de cambios",
  "Asientos delanteros", "Asientos traseros", "Cinturones de seguridad",
  "Tapicería/Forros", "Alfombras/Pisos", "Cielo raso",
  "Guantera", "Consola central", "Espejos interiores",
  "Aire acondicionado", "Radio/Sistema de audio", "Pantalla multimedia",
  "Encendedor/Puerto USB", "Luces interiores", "Manijas de puertas",
  "Vidrios eléctricos", "Seguros eléctricos", "Bocina/Claxon"
];

export const InteriorTab = ({ checkItems, setCheckItems }: InteriorTabProps) => {
  return (
    <ChecklistSection
      title="Checklist Interior"
      categoria="interior"
      items={INTERIOR_ITEMS}
      checkItems={checkItems}
      setCheckItems={setCheckItems}
    />
  );
};
