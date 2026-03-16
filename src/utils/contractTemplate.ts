/**
 * Plantilla HTML para el Contrato de Arrendamiento de EUROCAR RENTAL
 * Basada exactamente en el PDF del contrato real
 */

export interface ContractData {
  cliente_nombre: string;
  cliente_documento: string;
  cliente_licencia: string;
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
const LOGO_BASE64 = "LOGO_PLACEHOLDER";

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
    .logo-section { display: table-cell; vertical-align: middle; width: 100px; }
    .logo-img { height: 60px; }
    .company-info { display: table-cell; vertical-align: middle; padding-left: 15px; }
    .company-name { font-size: 22px; font-weight: bold; color: #0066cc; }
    .company-nit { font-size: 11px; color: #666; }
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

<table class="two-col">
<tr>
<td>
  <div class="section">
    <div class="section-title">1. EL ARRENDATARIO</div>
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
      reservas@eurocarental.com
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
