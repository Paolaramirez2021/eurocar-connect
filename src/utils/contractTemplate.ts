/**
 * Plantilla HTML para el Contrato de Arrendamiento de EUROCAR RENTAL
 * Basada exactamente en el PDF del contrato real
 */

export interface ContractData {
  cliente_nombre: string;
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
  firma_url?: string;
  huella_url?: string;
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

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Contrato EUROCAR - ${data.numero_contrato}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #333; margin: 20px; }
    .header { border-bottom: 3px solid #0066cc; padding-bottom: 10px; margin-bottom: 15px; }
    .header-content { display: table; width: 100%; }
    .logo-section { display: table-cell; vertical-align: middle; width: 120px; }
    .logo-img { height: 90px; }
    .company-info { display: table-cell; vertical-align: middle; padding-left: 15px; }
    .company-name { font-size: 24px; font-weight: bold; color: #0066cc; }
    .company-nit { font-size: 12px; color: #666; }
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
    .clausulas { font-size: 8px; text-align: justify; }
    .clausulas p { margin-bottom: 5px; }
    .clausulas strong { color: #0066cc; }
    .signatures { margin-top: 25px; }
    .sig-box { display: inline-block; width: 45%; text-align: center; vertical-align: top; }
    .sig-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
    .footer { text-align: center; font-size: 7px; color: #666; margin-top: 15px; border-top: 1px solid #ccc; padding-top: 8px; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-content">
    <div class="logo-section">
      <img src="data:image/png;base64,${LOGO_BASE64}" class="logo-img" alt="EUROCAR">
    </div>
    <div class="company-info">
      <div class="company-name">EUROCAR RENTAL SAS</div>
      <div class="company-nit">NIT: 900269555</div>
    </div>
  </div>
</div>

<div class="title">CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR</div>
<div class="contract-num">No. ${data.numero_contrato} | Fecha: ${data.fecha_contrato}</div>

${data.es_preliminar ? '<div class="prelim-badge">⚠ DOCUMENTO PRELIMINAR - SIN VALIDEZ LEGAL HASTA FIRMA DEFINITIVA</div>' : ''}

<div class="section-title">1. IDENTIFICACIÓN DE LAS PARTES</div>

<table class="two-col">
<tr>
<td>
  <div class="section">
    <div class="section-title">EL ARRENDATARIO</div>
    <div class="row"><span class="label">NOMBRE/RAZÓN SOCIAL:</span> <span class="value">${data.cliente_nombre}</span></div>
    <div class="row"><span class="label">DOCUMENTO IDENTIDAD:</span> <span class="value">${data.cliente_documento}</span></div>
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
    <tr><th>#</th><th>DOCUMENTO IDENTIDAD</th><th>N. LICENCIA</th><th>VENCIMIENTO</th></tr>
    <tr><td>1</td><td>${data.cliente_documento}</td><td>${data.cliente_licencia || 'N/A'}</td><td>N/A</td></tr>
    <tr><td>2</td><td></td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td></td><td></td></tr>
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
    <p><strong>I. SEGUROS:</strong> El seguro no tiene cobertura si el vehículo es utilizado para trabajar con plataformas, piques, pruebas de seguridad o manejo defensivo, tampoco tiene cobertura por maltrato al vehículo, robo de accesorios, ni lucro cesante por tiempo de inutilidad por mal uso. Será total responsabilidad por parte de EL ARRENDATARIO si el vehículo es usado bajo efectos de alcohol o sustancias psicoactivas, o por uso en actividades ilícitas. El seguro tiene una protección del 80% del valor comercial del vehículo, quedando a cargo de EL ARRENDATARIO el 20% no cubierto por la póliza con un deducible mínimo de <strong>XXXXXXXXXXXXX</strong>. EL ARRENDATARIO ACEPTA los seguros, cláusulas y condiciones estipuladas en el presente contrato y autoriza a EL ARRENDADOR para hacer uso de la garantía o descontar de la tarjeta de crédito de EL ARRENDATARIO el valor causado por cualquiera de estos conceptos.</p>
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
