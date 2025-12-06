import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface ContratoData {
  cliente: any;
  vehiculo: any;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  valor_dia: string;
  dias: string;
  km_incluidos: string;
  valor_km_adicional: string;
  deposito_tarjeta: string;
  valor_seguro: string;
  observaciones: string;
  tipo: 'preliminar' | 'final';
  firma?: string;
  huella?: string;
  foto?: string;
}

export async function generarContratoPreliminarPDF(data: ContratoData): Promise<Blob> {
  // Crear nuevo PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Tamaño carta
  
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const { width, height } = page.getSize();
  
  let yPosition = height - 50;

  // Encabezado
  page.drawText('EUROCAR RENTAL S.A.S', {
    x: width / 2 - 100,
    y: yPosition,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0.2, 0.5),
  });
  
  yPosition -= 20;
  page.drawText('NIT: 901.234.567-8', {
    x: width / 2 - 70,
    y: yPosition,
    size: 10,
    font: timesRomanFont,
  });

  yPosition -= 40;
  page.drawText('CONTRATO DE ARRENDAMIENTO DE VEHÍCULO', {
    x: width / 2 - 140,
    y: yPosition,
    size: 14,
    font: timesRomanBold,
  });

  // Generar número de contrato único
  const numeroContrato = `EC-${Date.now().toString().slice(-8)}`;
  yPosition -= 20;
  page.drawText(`Contrato No: ${numeroContrato}`, {
    x: width / 2 - 70,
    y: yPosition,
    size: 10,
    font: timesRomanFont,
  });

  yPosition -= 40;

  // Sección 1: DATOS DEL ARRENDATARIO
  page.drawText('1. DATOS DEL ARRENDATARIO', {
    x: 50,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  
  yPosition -= 25;
  
  const campos = [
    { label: 'Nombre Completo:', value: data.cliente?.nombre_completo || '' },
    { label: 'Documento:', value: data.cliente?.cedula_pasaporte || '' },
    { label: 'Dirección:', value: data.cliente?.direccion || '' },
    { label: 'Teléfono:', value: data.cliente?.telefono || '' },
    { label: 'Celular:', value: data.cliente?.celular || '' },
    { label: 'Email:', value: data.cliente?.email || '' },
  ];

  campos.forEach(campo => {
    page.drawText(`${campo.label} ${campo.value}`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 20;
  });

  yPosition -= 10;

  // Sección 2: DATOS DEL VEHÍCULO
  page.drawText('2. DATOS DEL VEHÍCULO', {
    x: 50,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  
  yPosition -= 25;

  const camposVehiculo = [
    { label: 'Vehículo:', value: `${data.vehiculo?.marca || ''} ${data.vehiculo?.modelo || ''}` },
    { label: 'Placa:', value: data.vehiculo?.placa || '' },
    { label: 'Color:', value: data.vehiculo?.color || '' },
    { label: 'Kilometraje Inicial:', value: data.vehiculo?.kilometraje || '' },
  ];

  camposVehiculo.forEach(campo => {
    page.drawText(`${campo.label} ${campo.value}`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 20;
  });

  yPosition -= 10;

  // Sección 3: TÉRMINOS DEL CONTRATO
  page.drawText('3. TÉRMINOS DEL CONTRATO', {
    x: 50,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  
  yPosition -= 25;

  const terminos = [
    { label: 'Fecha Inicio:', value: `${data.fecha_inicio} - ${data.hora_inicio}` },
    { label: 'Fecha Fin:', value: `${data.fecha_fin} - ${data.hora_fin}` },
    { label: 'Días de Alquiler:', value: data.dias },
    { label: 'Kilómetros Incluidos:', value: `${data.km_incluidos} km` },
    { label: 'Valor por km adicional:', value: `$${data.valor_km_adicional} COP` },
  ];

  terminos.forEach(campo => {
    page.drawText(`${campo.label} ${campo.value}`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 20;
  });

  yPosition -= 10;

  // Sección 4: VALORES
  page.drawText('4. VALORES Y FORMA DE PAGO', {
    x: 50,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  
  yPosition -= 25;

  const valorDia = parseFloat(data.valor_dia) || 0;
  const dias = parseInt(data.dias) || 0;
  const seguro = parseFloat(data.valor_seguro) || 0;
  const subtotal = valorDia * dias;
  const iva = subtotal * 0.19;
  const total = subtotal + iva + seguro;

  const valores = [
    { label: 'Valor por día:', value: `$${valorDia.toLocaleString('es-CO')} COP` },
    { label: 'Subtotal:', value: `$${subtotal.toLocaleString('es-CO')} COP` },
    { label: 'Seguro:', value: `$${seguro.toLocaleString('es-CO')} COP` },
    { label: 'IVA (19%):', value: `$${iva.toLocaleString('es-CO')} COP` },
    { label: 'TOTAL:', value: `$${total.toLocaleString('es-CO')} COP`, bold: true },
  ];

  valores.forEach(campo => {
    page.drawText(`${campo.label} ${campo.value}`, {
      x: 60,
      y: yPosition,
      size: campo.bold ? 12 : 10,
      font: campo.bold ? timesRomanBold : timesRomanFont,
    });
    yPosition -= 20;
  });

  if (data.deposito_tarjeta) {
    page.drawText(`Depósito en Tarjeta: $${parseFloat(data.deposito_tarjeta).toLocaleString('es-CO')} COP`, {
      x: 60,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
    });
    yPosition -= 20;
  }

  yPosition -= 20;

  // Cláusulas principales
  page.drawText('5. CLÁUSULAS PRINCIPALES', {
    x: 50,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
  });
  
  yPosition -= 25;

  const clausulas = [
    'a) El ARRENDATARIO se compromete a usar el vehículo dentro del territorio nacional.',
    'b) El vehículo debe ser devuelto con el mismo nivel de combustible.',
    'c) El ARRENDATARIO es responsable de multas de tránsito durante el periodo de alquiler.',
    'd) Cualquier daño al vehículo será responsabilidad del ARRENDATARIO.',
    'e) El ARRENDATARIO acepta la Política de Tratamiento de Datos Personales.',
  ];

  clausulas.forEach(clausula => {
    const lines = splitText(clausula, 90);
    lines.forEach(line => {
      page.drawText(line, {
        x: 60,
        y: yPosition,
        size: 9,
        font: timesRomanFont,
      });
      yPosition -= 15;
    });
  });

  // Pie de página
  yPosition = 60;
  page.drawText('Documento preliminar - Sujeto a firma y revisión', {
    x: width / 2 - 140,
    y: yPosition,
    size: 9,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  yPosition -= 15;
  page.drawText(`Generado el: ${new Date().toLocaleString('es-CO')}`, {
    x: width / 2 - 80,
    y: yPosition,
    size: 8,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Generar PDF
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function generarContratoFinalPDF(data: ContratoData): Promise<Blob> {
  const pdfBlob = await generarContratoPreliminarPDF(data);
  const pdfBytes = await pdfBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Agregar página para firma, huella y foto
  const sigPage = pdfDoc.addPage([612, 792]);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  
  let yPos = 750;
  
  sigPage.drawText('FIRMAS Y ACEPTACIÓN', {
    x: 200,
    y: yPos,
    size: 14,
    font: timesRomanBold,
  });
  
  yPos -= 60;

  // Agregar firma si existe
  if (data.firma) {
    try {
      const firmaImage = await pdfDoc.embedPng(data.firma);
      sigPage.drawImage(firmaImage, {
        x: 100,
        y: yPos - 100,
        width: 200,
        height: 80,
      });
      sigPage.drawText('Firma del Arrendatario', {
        x: 130,
        y: yPos - 120,
        size: 10,
        font: timesRomanFont,
      });
    } catch (error) {
      console.error('Error al agregar firma:', error);
    }
  }

  // Agregar huella si existe
  if (data.huella) {
    try {
      const huellaImage = await pdfDoc.embedPng(data.huella);
      sigPage.drawImage(huellaImage, {
        x: 350,
        y: yPos - 100,
        width: 100,
        height: 100,
      });
      sigPage.drawText('Huella Digital', {
        x: 370,
        y: yPos - 120,
        size: 10,
        font: timesRomanFont,
      });
    } catch (error) {
      console.error('Error al agregar huella:', error);
    }
  }

  yPos -= 180;

  // Agregar foto si existe
  if (data.foto) {
    try {
      const fotoImage = await pdfDoc.embedJpg(data.foto);
      sigPage.drawImage(fotoImage, {
        x: 230,
        y: yPos - 150,
        width: 150,
        height: 150,
      });
      sigPage.drawText('Fotografía del Cliente', {
        x: 250,
        y: yPos - 170,
        size: 10,
        font: timesRomanFont,
      });
    } catch (error) {
      console.error('Error al agregar foto:', error);
    }
  }

  yPos -= 200;

  sigPage.drawText(`Fecha de firma: ${new Date().toLocaleString('es-CO')}`, {
    x: 200,
    y: yPos,
    size: 10,
    font: timesRomanFont,
  });

  const finalPdfBytes = await pdfDoc.save();
  return new Blob([finalPdfBytes], { type: 'application/pdf' });
}

function splitText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += word + ' ';
    } else {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    }
  });

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines;
}
