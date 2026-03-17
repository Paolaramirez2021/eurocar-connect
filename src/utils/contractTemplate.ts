/**
 * Plantilla HTML para el Contrato de Arrendamiento de EUROCAR RENTAL
 * Basada exactamente en el PDF del contrato real
 */

export interface ContractData {
  cliente_nombre: string;
  cliente_tipo_documento?: string;
  cliente_documento: string;
  cliente_licencia: string;
  cliente_licencia_vencimiento: string;
  cliente_direccion: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_email: string;
  vehiculo_marca: string;
  vehiculo_placa: string;
  vehiculo_color: string;
  vehiculo_km_salida: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_fin: string;
  hora_fin: string;
  dias: number;
  servicio: string;
  valor_dia: number;
  valor_dias: number;
  valor_adicional: number;
  subtotal: number;
  descuento: number;
  total_contrato: number;
  iva: number;
  total: number;
  valor_reserva: number;
  forma_pago: string;
  numero_contrato: string;
  fecha_contrato: string;
  deducible: string;
  // Campos para contrato firmado
  firma_url?: string;
  huella_url?: string;
  foto_cliente_url?: string;
  documento_frente_url?: string;
  documento_reverso_url?: string;
  es_preliminar?: boolean;
}

// Logo EUROCAR en base64
const LOGO_BASE64 = "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";

export const generateContractHTML = (data: ContractData): string => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDocumentType = (type: string | undefined) => {
    const types: Record<string, string> = {
      'cedula': 'C.C.',
      'cedula_extranjeria': 'C.E.',
      'pasaporte': 'Pasaporte',
      'pep': 'PEP',
      'ppt': 'PPT'
    };
    return types[type || 'cedula'] || 'C.C.';
  };

  const tipoDoc = formatDocumentType(data.cliente_tipo_documento);
  
  // Determinar si es contrato final (tiene firma y no es preliminar)
  const esFinal = !data.es_preliminar && data.firma_url;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato EUROCAR - ${data.numero_contrato}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; margin: 20px; }
    .header { text-align: center; border-bottom: 3px solid #0066cc; padding-bottom: 10px; margin-bottom: 15px; }
    .logo-img { height: 100px; }
    .title { font-size: 14px; font-weight: bold; color: #0066cc; text-align: center; margin: 15px 0 5px 0; }
    .contract-num { text-align: center; font-size: 11px; color: #666; margin-bottom: 15px; }
    ${data.es_preliminar ? '.prelim-badge { background: #ff9800; color: white; padding: 8px; text-align: center; font-weight: bold; margin-bottom: 15px; }' : ''}
    .section { margin-bottom: 12px; }
    .section-title { background: #0066cc; color: white; padding: 4px 8px; font-weight: bold; font-size: 10px; margin-bottom: 6px; }
    .row { margin-bottom: 3px; }
    .label { font-weight: bold; display: inline-block; width: 140px; font-size: 10px; }
    .value { border-bottom: 1px solid #ccc; display: inline-block; min-width: 180px; padding-left: 5px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 9px; }
    th { background: #f0f0f0; }
    .two-col { width: 100%; }
    .two-col td { width: 50%; vertical-align: top; border: none; padding: 0 10px 0 0; }
    .values-table td { padding: 2px 6px; font-size: 9px; }
    .values-table .total { background: #0066cc; color: white; font-weight: bold; }
    .info-text { font-size: 9px; text-align: justify; background: #f9f9f9; padding: 8px; margin: 10px 0; border-left: 3px solid #0066cc; }
    .clausulas { font-size: 8px; text-align: justify; }
    .clausulas p { margin-bottom: 5px; }
    .clausulas strong { color: #0066cc; }
    .signatures { margin-top: 25px; }
    .sig-box { display: inline-block; width: 45%; text-align: center; vertical-align: top; }
    .sig-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
    .footer { text-align: center; font-size: 7px; color: #666; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 8px; }
    .verification-section { margin-top: 20px; page-break-inside: avoid; }
    .verification-grid { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }
    .verification-item { text-align: center; width: 150px; }
    .verification-item img { max-width: 140px; max-height: 100px; border: 1px solid #ccc; border-radius: 4px; }
    .verification-item p { font-size: 8px; color: #666; margin-top: 4px; }
    .final-badge { background: #28a745; color: white; padding: 8px; text-align: center; font-weight: bold; margin-bottom: 15px; }
    .signature-img { max-height: 50px; max-width: 150px; }
  </style>
</head>
<body>

<div class="header">
  <img src="data:image/png;base64,${LOGO_BASE64}" class="logo-img" alt="EUROCAR RENTAL">
</div>

<div class="title">CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR</div>
<div class="contract-num">No. ${data.numero_contrato} | Fecha: ${data.fecha_contrato}</div>

${data.es_preliminar ? '<div class="prelim-badge">⚠ DOCUMENTO PRELIMINAR - SIN VALIDEZ LEGAL HASTA FIRMA DEFINITIVA</div>' : ''}
${esFinal ? '<div class="final-badge">✓ CONTRATO FIRMADO DIGITALMENTE</div>' : ''}

<div class="section-title">1. IDENTIFICACIÓN DE LAS PARTES</div>

<table class="two-col">
<tr>
<td>
  <div class="section">
    <div class="section-title">EL ARRENDATARIO</div>
    <div class="row"><span class="label">NOMBRE/RAZÓN SOCIAL:</span> <span class="value">${data.cliente_nombre}</span></div>
    <div class="row"><span class="label">TIPO DOCUMENTO:</span> <span class="value">${tipoDoc}</span></div>
    <div class="row"><span class="label">No. DOCUMENTO:</span> <span class="value">${data.cliente_documento}</span></div>
    <div class="row"><span class="label">LICENCIA CONDUCCIÓN:</span> <span class="value">${data.cliente_licencia || 'N/A'}</span></div>
    <div class="row"><span class="label">DIRECCIÓN:</span> <span class="value">${data.cliente_direccion || 'N/A'}</span></div>
    <div class="row"><span class="label">TELÉFONO:</span> <span class="value">${data.cliente_telefono}</span></div>
    <div class="row"><span class="label">CIUDAD/PAÍS:</span> <span class="value">${data.cliente_ciudad || 'Colombia'}</span></div>
    <div class="row"><span class="label">CORREO ELECTRÓNICO:</span> <span class="value">${data.cliente_email}</span></div>
  </div>
</td>
<td>
  <div class="section">
    <div class="section-title">EL ARRENDADOR</div>
    <div style="background: #f5f5f5; padding: 8px; font-size: 9px;">
      <strong>EUROCAR RENTAL SAS</strong><br>
      NIT: 900269555<br>
      AV CALLE 26 69C-03 LOCAL 105<br>
      BOGOTÁ - COLOMBIA<br>
      Tel: 320 834 1163 - 313 209 4156<br>
      jennygomez@eurocarental.com
    </div>
  </div>
</td>
</tr>
</table>

<div class="section">
  <div class="section-title">2. CONDUCTORES AUTORIZADOS</div>
  <table>
    <tr><th>#</th><th>TIPO DOC</th><th>No. DOCUMENTO</th><th>N. LICENCIA</th><th>VENCIMIENTO</th></tr>
    <tr><td>1</td><td>${tipoDoc}</td><td>${data.cliente_documento}</td><td>${data.cliente_licencia || 'N/A'}</td><td>${data.cliente_licencia_vencimiento || 'N/A'}</td></tr>
    <tr><td>2</td><td></td><td></td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td></td><td></td><td></td></tr>
  </table>
</div>

<table class="two-col">
<tr>
<td>
  <div class="section">
    <div class="section-title">3. VEHÍCULO</div>
    <div class="row"><span class="label">MARCA/MODELO:</span> <span class="value">${data.vehiculo_marca}</span></div>
    <div class="row"><span class="label">PLACA:</span> <span class="value">${data.vehiculo_placa}</span></div>
    <div class="row"><span class="label">COLOR:</span> <span class="value">${data.vehiculo_color || 'N/A'}</span></div>
    <div class="row"><span class="label">KM SALIDA:</span> <span class="value">${data.vehiculo_km_salida || 'N/A'}</span></div>
  </div>
</td>
<td>
  <div class="section">
    <div class="section-title">4. DURACIÓN DEL CONTRATO</div>
    <div class="row"><span class="label">FECHA INICIO:</span> <span class="value">${data.fecha_inicio} - ${data.hora_inicio || '00:00'}</span></div>
    <div class="row"><span class="label">FECHA TERMINACIÓN:</span> <span class="value">${data.fecha_fin} - ${data.hora_fin || '00:00'}</span></div>
    <div class="row"><span class="label">DÍAS:</span> <span class="value">${data.dias}</span></div>
    <div class="row"><span class="label">SERVICIO:</span> <span class="value">${data.servicio || 'Turismo'}</span></div>
  </div>
</td>
</tr>
</table>

<div class="info-text">
  Servicio a Viajar: Bogotá | Término contrato: 2 días - 400 kms / km adicional $3.000
</div>

<table class="two-col">
<tr>
<td>
  <div class="section">
    <div class="section-title">5. VALOR DEL CONTRATO</div>
    <table class="values-table">
      <tr><td><strong>VALOR DÍA:</strong></td><td style="text-align:right">${formatCurrency(data.valor_dia)}</td></tr>
      <tr><td><strong>VALOR ${data.dias} DÍAS:</strong></td><td style="text-align:right">${formatCurrency(data.valor_dias)}</td></tr>
      <tr><td><strong>VALOR ADICIONAL:</strong></td><td style="text-align:right">${formatCurrency(data.valor_adicional)}</td></tr>
      <tr><td><strong>SUBTOTAL:</strong></td><td style="text-align:right">${formatCurrency(data.subtotal)}</td></tr>
      <tr><td><strong>DESCUENTO:</strong></td><td style="text-align:right">${formatCurrency(data.descuento)}</td></tr>
      <tr><td><strong>TOTAL CONTRATO:</strong></td><td style="text-align:right">${formatCurrency(data.total_contrato)}</td></tr>
      <tr><td><strong>IVA 19%:</strong></td><td style="text-align:right">${formatCurrency(data.iva)}</td></tr>
      <tr class="total"><td><strong>TOTAL:</strong></td><td style="text-align:right"><strong>${formatCurrency(data.total)}</strong></td></tr>
    </table>
  </div>
</td>
<td>
  <div class="section">
    <div class="section-title">6. RESERVA Y FORMA DE PAGO</div>
    <div class="row"><span class="label">VALOR RESERVA:</span> <span class="value">${formatCurrency(data.valor_reserva)}</span></div>
    <div class="row"><span class="label">FORMA DE PAGO:</span> <span class="value">${data.forma_pago || 'N/A'}</span></div>
    <div class="row"><span class="label">SALDO PENDIENTE:</span> <span class="value">${formatCurrency(data.total - data.valor_reserva)}</span></div>
  </div>
</td>
</tr>
</table>

<div class="section">
  <div class="section-title">7. CLÁUSULAS Y CONDICIONES</div>
  <div class="clausulas">
    <p><strong>A.</strong> En caso de accidente: si es choque simple comunicarse de inmediato con EL ARRENDADOR, seguir indicaciones del funcionario. Si es choque complejo comunicarse de inmediato con EL ARRENDADOR, solicitar intervención de autoridades de tránsito y por ningún motivo haga arreglos al vehículo.</p>
    <p><strong>B.</strong> El ARRENDATARIO se compromete a responder por multas, comparendos o inmovilizaciones ocasionados durante el periodo de renta y debe pagar el valor total de la sanción más 10% por gastos administrativos.</p>
    <p><strong>C.</strong> La cancelación de la reserva tiene una penalidad equivalente al 30% del valor total de la renta.</p>
    <p><strong>D.</strong> El valor de la hora adicional es el 10% de la tarifa día, a partir de la quinta (5) hora adicional se cobrará el día completo.</p>
    <p><strong>E.</strong> En caso de que EL ARRENDATARIO haga entrega del vehículo antes del tiempo pactado en el contrato no habrá devolución de dinero.</p>
    <p><strong>F.</strong> El vehículo se entrega limpio y full de combustible. EL ARRENDATARIO debe regresarlo en las mismas condiciones, de lo contrario se aplicará un sobrecosto por esos conceptos.</p>
    <p><strong>G.</strong> En caso de extender la renta, EL ARRENDATARIO debe informar con anticipación a EL ARRENDADOR y realizar el pago correspondiente.</p>
    <p><strong>H.</strong> Evite fumar dentro del vehículo, de lo contrario debe asumir el costo del lavado de la tapicería.</p>
    <p><strong>I. SEGUROS:</strong> El seguro no tiene cobertura si el vehículo es utilizado para trabajar con plataformas, piques, pruebas de seguridad o manejo defensivo, tampoco tiene cobertura por maltrato al vehículo, robo de accesorios, ni lucro cesante por tiempo de inutilidad por mal uso. Será total responsabilidad por parte de EL ARRENDATARIO si el vehículo es usado bajo efectos de alcohol o sustancias psicoactivas, o por uso en actividades ilícitas. El seguro tiene una protección del 80% del valor comercial del vehículo, quedando a cargo de EL ARRENDATARIO el 20% no cubierto por la póliza con un deducible mínimo de <strong>${data.deducible}</strong>. EL ARRENDATARIO ACEPTA los seguros, cláusulas y condiciones estipuladas en el presente contrato y autoriza a EL ARRENDADOR para hacer uso de la garantía o descontar de la tarjeta de crédito de EL ARRENDATARIO el valor causado por cualquiera de estos conceptos.</p>
    <p><strong>J.</strong> El ARRENDATARIO autoriza a EL ARRENDADOR al tratamiento de sus datos personales conforme a la ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas concordantes, de acuerdo a las políticas de tratamiento de datos que se encuentran en www.eurocarental.com</p>
    <p><strong>K.</strong> EL ARRENDATARIO acepta que conoce los términos y condiciones que se encuentran en www.eurocarental.com</p>
  </div>
</div>

<div class="section">
  <p style="font-size: 8px; text-align: justify; margin-bottom: 8px;">
    <strong>Firma Digital:</strong> El presente documento lo firma el ARRENDATARIO por medio de firma simple (trazo manual digitalizado), acompañado de huella digital y foto para demostrar la autenticidad de la persona, además se identifica la IP, fecha, hora y se envía al correo electrónico de EL ARRENDATARIO la copia de este contrato.
  </p>
</div>

<div class="signatures">
  <div class="sig-box">
    <div class="sig-line">${data.firma_url ? `<img src="${data.firma_url}" style="max-height:35px;">` : ''}</div>
    <strong>EL ARRENDATARIO</strong><br>
    <span style="font-size:9px">DOC: ${data.cliente_documento}<br>
    NOMBRE: ${data.cliente_nombre}</span>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <strong>EL ARRENDADOR</strong><br>
    <span style="font-size:9px">EUROCAR RENTAL SAS<br>
    NIT: 900269555</span>
  </div>
</div>

<div class="footer">
  ${data.es_preliminar ? 'Este es un documento preliminar enviado para revisión. Para formalizar el contrato debe completar el proceso de firma digital.' : 'Documento firmado digitalmente.'}
  <br>
  <strong>EUROCAR RENTAL SAS</strong> | AV CALLE 26 69C-03 LOCAL 105 | BOGOTÁ - COLOMBIA | www.eurocarental.com | Tel: 320 834 1163
</div>

</body>
</html>`;
};

export default generateContractHTML;
