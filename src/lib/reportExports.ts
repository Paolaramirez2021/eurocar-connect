import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DetailedReportData {
  placa: string;
  marca: string;
  modelo: string;
  occupiedDays: string[];
  maintenanceDays: string[];
  availableDays: number;
  totalDays: number;
}

interface SummaryReportData {
  placa: string;
  marca: string;
  modelo: string;
  occupiedDays: number;
  availableDays: number;
  totalDays: number;
  occupancyRate: number;
  status: string;
}

// Exportar informe detallado a CSV
export const exportDetailedReportToCSV = (
  data: DetailedReportData[],
  dateRange: { from: Date; to: Date }
) => {
  const headers = [
    "Placa",
    "Marca",
    "Modelo",
    "Días Ocupados (Reservas)",
    "Días en Mantenimiento",
    "Días Disponibles",
    "Total Días"
  ];

  const rows = data.map(vehicle => [
    vehicle.placa,
    vehicle.marca,
    vehicle.modelo,
    vehicle.occupiedDays.join(", ") || "Sin reservas",
    vehicle.maintenanceDays.join(", ") || "Sin mantenimiento",
    vehicle.availableDays.toString(),
    vehicle.totalDays.toString()
  ]);

  const csvContent = [
    [`Informe Detallado de Reservas`],
    [`Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(","))
    .join("\n");

  downloadCSV(csvContent, `informe-detallado-${format(new Date(), "yyyy-MM-dd")}.csv`);
};

// Exportar informe general a CSV
export const exportSummaryReportToCSV = (
  data: SummaryReportData[],
  dateRange: { from: Date; to: Date }
) => {
  const headers = [
    "Placa",
    "Marca",
    "Modelo",
    "Días Ocupados",
    "Días Disponibles",
    "Total Días",
    "% Ocupación",
    "Estado"
  ];

  const rows = data.map(vehicle => [
    vehicle.placa,
    vehicle.marca,
    vehicle.modelo,
    vehicle.occupiedDays.toString(),
    vehicle.availableDays.toString(),
    vehicle.totalDays.toString(),
    vehicle.occupancyRate.toFixed(1) + "%",
    vehicle.status
  ]);

  const csvContent = [
    [`Informe General de Ocupación`],
    [`Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(","))
    .join("\n");

  downloadCSV(csvContent, `informe-general-${format(new Date(), "yyyy-MM-dd")}.csv`);
};

// Exportar informe detallado a PDF
export const exportDetailedReportToPDF = async (
  data: DetailedReportData[],
  dateRange: { from: Date; to: Date }
) => {
  // Usar jspdf que ya está instalado
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  // Título
  doc.setFontSize(16);
  doc.text("Informe Detallado de Reservas", 14, 20);

  // Período
  doc.setFontSize(10);
  doc.text(
    `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`,
    14,
    28
  );

  // Tabla
  let yPos = 38;
  doc.setFontSize(8);

  // Headers
  doc.setFont(undefined, "bold");
  doc.text("Placa", 14, yPos);
  doc.text("Vehículo", 40, yPos);
  doc.text("Días Ocupados", 80, yPos);
  doc.text("Disponibles", 160, yPos);
  doc.text("Total", 185, yPos);

  yPos += 6;
  doc.setFont(undefined, "normal");

  // Datos
  data.forEach((vehicle) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(vehicle.placa, 14, yPos);
    doc.text(`${vehicle.marca} ${vehicle.modelo}`, 40, yPos);
    doc.text(vehicle.occupiedDays.length.toString(), 90, yPos);
    doc.text(vehicle.availableDays.toString(), 165, yPos);
    doc.text(vehicle.totalDays.toString(), 188, yPos);

    yPos += 6;
  });

  doc.save(`informe-detallado-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

// Exportar informe general a PDF
export const exportSummaryReportToPDF = async (
  data: SummaryReportData[],
  dateRange: { from: Date; to: Date }
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  // Título
  doc.setFontSize(16);
  doc.text("Informe General de Ocupación", 14, 20);

  // Período
  doc.setFontSize(10);
  doc.text(
    `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`,
    14,
    28
  );

  // Tabla
  let yPos = 38;
  doc.setFontSize(8);

  // Headers
  doc.setFont(undefined, "bold");
  doc.text("Placa", 14, yPos);
  doc.text("Vehículo", 35, yPos);
  doc.text("Ocupados", 80, yPos);
  doc.text("Disponibles", 110, yPos);
  doc.text("% Ocupación", 145, yPos);
  doc.text("Estado", 175, yPos);

  yPos += 6;
  doc.setFont(undefined, "normal");

  // Datos
  data.forEach((vehicle) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(vehicle.placa, 14, yPos);
    doc.text(`${vehicle.marca} ${vehicle.modelo}`, 35, yPos);
    doc.text(vehicle.occupiedDays.toString(), 88, yPos);
    doc.text(vehicle.availableDays.toString(), 120, yPos);
    doc.text(vehicle.occupancyRate.toFixed(1) + "%", 150, yPos);
    doc.text(vehicle.status, 175, yPos);

    yPos += 6;
  });

  doc.save(`informe-general-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

// Función auxiliar para descargar CSV
const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
