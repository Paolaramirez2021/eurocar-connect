/**
 * Plantilla HTML para el Contrato de Arrendamiento de EUROCAR RENTAL
 * Genera HTML que será convertido a PDF con Puppeteer
 */

export interface ContractData {
  // Datos del cliente
  cliente_nombre: string;
  cliente_documento: string;
  cliente_licencia: string;
  cliente_direccion: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_email: string;
  
  // Conductores adicionales (opcional)
  conductores?: Array<{
    documento: string;
    licencia: string;
    vencimiento: string;
  }>;
  
  // Datos del vehículo
  vehiculo_marca: string;
  vehiculo_placa: string;
  vehiculo_color: string;
  vehiculo_km_salida: string;
  
  // Duración del contrato
  fecha_inicio: string;
  hora_inicio: string;
  fecha_fin: string;
  hora_fin: string;
  dias: number;
  servicio: string;
  
  // Valores
  valor_dia: number;
  valor_dias: number;
  valor_adicional: number;
  subtotal: number;
  descuento: number;
  total_contrato: number;
  iva: number;
  total: number;
  
  // Reserva y pago
  valor_reserva: number;
  forma_pago: string;
  
  // Contrato
  numero_contrato: string;
  fecha_contrato: string;
  
  // Deducible del seguro
  deducible: string;
  
  // Firma (opcional, para contrato final)
  firma_url?: string;
  huella_url?: string;
  
  // Es preliminar?
  es_preliminar?: boolean;
}

export const generateContractHTML = (data: ContractData): string => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const conductor1 = data.conductores?.[0] || { documento: '', licencia: '', vencimiento: '' };
  const conductor2 = data.conductores?.[1] || { documento: '', licencia: '', vencimiento: '' };
  const conductor3 = data.conductores?.[2] || { documento: '', licencia: '', vencimiento: '' };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato EUROCAR RENTAL - ${data.numero_contrato}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
      padding: 15px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #1a5f7a;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1a5f7a;
    }
    
    .logo-sub {
      font-size: 11px;
      color: #666;
    }
    
    .contract-title {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      color: #1a5f7a;
      margin-bottom: 5px;
    }
    
    .contract-number {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }
    
    ${data.es_preliminar ? `
    .preliminary-badge {
      background: #f59e0b;
      color: white;
      padding: 5px 15px;
      border-radius: 4px;
      text-align: center;
      font-weight: bold;
      margin-bottom: 10px;
    }
    ` : ''}
    
    .section {
      margin-bottom: 12px;
    }
    
    .section-title {
      background: #1a5f7a;
      color: white;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 6px;
    }
    
    .two-columns {
      display: flex;
      gap: 15px;
    }
    
    .column {
      flex: 1;
    }
    
    .field-row {
      display: flex;
      margin-bottom: 3px;
    }
    
    .field-label {
      font-weight: bold;
      min-width: 120px;
      color: #555;
    }
    
    .field-value {
      flex: 1;
      border-bottom: 1px solid #ccc;
      padding-left: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    
    table th, table td {
      border: 1px solid #ccc;
      padding: 4px;
      text-align: left;
    }
    
    table th {
      background: #e5e7eb;
      font-weight: bold;
    }
    
    .values-table {
      width: 100%;
    }
    
    .values-table td {
      padding: 3px 6px;
    }
    
    .values-table .label {
      font-weight: bold;
      width: 50%;
    }
    
    .values-table .value {
      text-align: right;
    }
    
    .values-table .total-row {
      background: #1a5f7a;
      color: white;
      font-weight: bold;
    }
    
    .clausulas {
      font-size: 8px;
      line-height: 1.4;
      text-align: justify;
    }
    
    .clausulas p {
      margin-bottom: 5px;
    }
    
    .clausulas strong {
      color: #1a5f7a;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #1a5f7a;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-box .title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #1a5f7a;
    }
    
    .signature-line {
      border-bottom: 1px solid #333;
      height: 60px;
      margin-bottom: 5px;
    }
    
    .signature-img {
      max-height: 55px;
      max-width: 100%;
    }
    
    .footer {
      margin-top: 15px;
      text-align: center;
      font-size: 8px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 8px;
    }
    
    .arrendador-info {
      background: #f3f4f6;
      padding: 8px;
      border-radius: 4px;
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">EUROCAR RENTAL</div>
      <div class="logo-sub">ALQUILER DE VEHÍCULOS</div>
    </div>
    <div style="text-align: right; font-size: 9px;">
      <div><strong>NIT:</strong> 900269555</div>
      <div><strong>Tel:</strong> 320 834 1163 - 313 209 4156</div>
      <div><strong>Email:</strong> reservas@eurocarental.com</div>
    </div>
  </div>

  <div class="contract-title">CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR</div>
  <div class="contract-number">No. ${data.numero_contrato} | Fecha: ${data.fecha_contrato}</div>
  
  ${data.es_preliminar ? '<div class="preliminary-badge">⚠️ DOCUMENTO PRELIMINAR - SIN VALIDEZ LEGAL HASTA FIRMA</div>' : ''}

  <div class="two-columns">
    <!-- Columna Izquierda: Arrendatario -->
    <div class="column">
      <div class="section">
        <div class="section-title">1. EL ARRENDATARIO</div>
        <div class="field-row">
          <span class="field-label">NOMBRE:</span>
          <span class="field-value">${data.cliente_nombre}</span>
        </div>
        <div class="field-row">
          <span class="field-label">DOCUMENTO:</span>
          <span class="field-value">${data.cliente_documento}</span>
        </div>
        <div class="field-row">
          <span class="field-label">LICENCIA:</span>
          <span class="field-value">${data.cliente_licencia || 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">DIRECCIÓN:</span>
          <span class="field-value">${data.cliente_direccion || 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">TELÉFONO:</span>
          <span class="field-value">${data.cliente_telefono}</span>
        </div>
        <div class="field-row">
          <span class="field-label">CIUDAD:</span>
          <span class="field-value">${data.cliente_ciudad || 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">EMAIL:</span>
          <span class="field-value">${data.cliente_email}</span>
        </div>
      </div>
    </div>

    <!-- Columna Derecha: Arrendador -->
    <div class="column">
      <div class="section">
        <div class="section-title">EL ARRENDADOR</div>
        <div class="arrendador-info">
          <strong>EUROCAR RENTAL SAS</strong><br>
          NIT: 900269555<br>
          AV CALLE 26 69C-03 LOCAL 105<br>
          BOGOTÁ - COLOMBIA<br>
          Tel: 320 834 1163 - 313 209 4156<br>
          reservas@eurocarental.com
        </div>
      </div>
    </div>
  </div>

  <!-- Conductores -->
  <div class="section">
    <div class="section-title">2. CONDUCTORES AUTORIZADOS</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>DOCUMENTO IDENTIDAD</th>
          <th>N. LICENCIA</th>
          <th>VENCIMIENTO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${conductor1.documento || data.cliente_documento}</td>
          <td>${conductor1.licencia || data.cliente_licencia || 'N/A'}</td>
          <td>${conductor1.vencimiento || 'N/A'}</td>
        </tr>
        <tr>
          <td>2</td>
          <td>${conductor2.documento || ''}</td>
          <td>${conductor2.licencia || ''}</td>
          <td>${conductor2.vencimiento || ''}</td>
        </tr>
        <tr>
          <td>3</td>
          <td>${conductor3.documento || ''}</td>
          <td>${conductor3.licencia || ''}</td>
          <td>${conductor3.vencimiento || ''}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Vehículo y Duración -->
  <div class="two-columns">
    <div class="column">
      <div class="section">
        <div class="section-title">3. VEHÍCULO</div>
        <div class="field-row">
          <span class="field-label">MARCA/MODELO:</span>
          <span class="field-value">${data.vehiculo_marca}</span>
        </div>
        <div class="field-row">
          <span class="field-label">PLACA:</span>
          <span class="field-value">${data.vehiculo_placa}</span>
        </div>
        <div class="field-row">
          <span class="field-label">COLOR:</span>
          <span class="field-value">${data.vehiculo_color || 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">KM SALIDA:</span>
          <span class="field-value">${data.vehiculo_km_salida || 'N/A'}</span>
        </div>
      </div>
    </div>
    
    <div class="column">
      <div class="section">
        <div class="section-title">4. DURACIÓN DEL CONTRATO</div>
        <div class="field-row">
          <span class="field-label">FECHA INICIO:</span>
          <span class="field-value">${data.fecha_inicio} - ${data.hora_inicio || '00:00'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">FECHA FIN:</span>
          <span class="field-value">${data.fecha_fin} - ${data.hora_fin || '00:00'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">DÍAS:</span>
          <span class="field-value">${data.dias}</span>
        </div>
        <div class="field-row">
          <span class="field-label">SERVICIO:</span>
          <span class="field-value">${data.servicio || 'Turismo'}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Valores y Pago -->
  <div class="two-columns">
    <div class="column">
      <div class="section">
        <div class="section-title">5. VALOR DEL CONTRATO</div>
        <table class="values-table">
          <tr>
            <td class="label">Valor día:</td>
            <td class="value">${formatCurrency(data.valor_dia)}</td>
          </tr>
          <tr>
            <td class="label">Valor ${data.dias} días:</td>
            <td class="value">${formatCurrency(data.valor_dias)}</td>
          </tr>
          <tr>
            <td class="label">Valor adicional:</td>
            <td class="value">${formatCurrency(data.valor_adicional)}</td>
          </tr>
          <tr>
            <td class="label">Subtotal:</td>
            <td class="value">${formatCurrency(data.subtotal)}</td>
          </tr>
          <tr>
            <td class="label">Descuento:</td>
            <td class="value">${formatCurrency(data.descuento)}</td>
          </tr>
          <tr>
            <td class="label">Total Contrato:</td>
            <td class="value">${formatCurrency(data.total_contrato)}</td>
          </tr>
          <tr>
            <td class="label">IVA 19%:</td>
            <td class="value">${formatCurrency(data.iva)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">TOTAL:</td>
            <td class="value">${formatCurrency(data.total)}</td>
          </tr>
        </table>
      </div>
    </div>
    
    <div class="column">
      <div class="section">
        <div class="section-title">6. RESERVA Y PAGO</div>
        <div class="field-row">
          <span class="field-label">RESERVA RECIBIDA:</span>
          <span class="field-value">${formatCurrency(data.valor_reserva)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">FORMA DE PAGO:</span>
          <span class="field-value">${data.forma_pago || 'N/A'}</span>
        </div>
        <div class="field-row">
          <span class="field-label">SALDO:</span>
          <span class="field-value">${formatCurrency(data.total - data.valor_reserva)}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Cláusulas -->
  <div class="section">
    <div class="section-title">7. CLÁUSULAS Y CONDICIONES</div>
    <div class="clausulas">
      <p><strong>A.</strong> En caso de accidente: si es choque simple comunicarse de inmediato con EL ARRENDADOR, seguir indicaciones del funcionario. Si es choque complejo comunicarse de inmediato con EL ARRENDADOR solicitar intervención de autoridades de tránsito y por ningún motivo haga arreglos al vehículo.</p>
      <p><strong>B.</strong> El ARRENDATARIO se compromete a responder por multas, comparendos o inmovilizaciones ocasionados durante el periodo de renta y debe pagar el valor total de la sanción más 10% por gastos administrativos.</p>
      <p><strong>C.</strong> La cancelación de la reserva tiene una penalidad equivalente al 30% del valor total de la renta.</p>
      <p><strong>D.</strong> El valor de la hora adicional es el 10% de la tarifa día, a partir de la quinta (5) hora adicional se cobrara el día completo.</p>
      <p><strong>E.</strong> En caso de que EL ARRENDATARIO haga entrega del vehículo antes del tiempo pactado en el contrato no habrá devolución de dinero.</p>
      <p><strong>F.</strong> El vehículo se entrega limpio y full de combustible. EL ARRENDATARIO debe regresarlo en las mismas condiciones de lo contrario se aplicará un sobrecosto por esos conceptos.</p>
      <p><strong>G.</strong> En caso de extender la renta, EL ARRENDATARIO debe informar con anticipación a EL ARRENDADOR y realizar el pago correspondiente.</p>
      <p><strong>H.</strong> Evite fumar dentro del vehículo, de lo contrario debe asumir el costo del lavado de la tapicería.</p>
      <p><strong>I. SEGUROS:</strong> El seguro no tiene cobertura si el vehículo es utilizado para trabajar con plataformas, piques, pruebas de seguridad o manejo defensivo, tampoco tiene cobertura por maltrato al vehículo, robo de accesorios, ni lucro cesante. Será total responsabilidad de EL ARRENDATARIO si el vehículo es usado bajo efectos de alcohol o sustancias psicoactivas. El seguro tiene una protección del 80% del valor comercial del vehículo, quedando a cargo de EL ARRENDATARIO el 20% no cubierto con un deducible mínimo de ${data.deducible || '$3.000.000 COP'}.</p>
      <p><strong>J.</strong> EL ARRENDATARIO autoriza a EL ARRENDADOR al tratamiento de sus datos personales conforme a la ley 1581 de 2012 y el Decreto 1377 de 2013.</p>
      <p><strong>K.</strong> EL ARRENDATARIO acepta que conoce los términos y condiciones que se encuentran en www.eurocarental.com</p>
    </div>
  </div>

  <!-- Firmas -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="title">EL ARRENDATARIO</div>
      <div class="signature-line">
        ${data.firma_url ? `<img src="${data.firma_url}" class="signature-img" alt="Firma">` : ''}
      </div>
      <div><strong>DOC:</strong> ${data.cliente_documento}</div>
      <div><strong>NOMBRE:</strong> ${data.cliente_nombre}</div>
    </div>
    
    <div class="signature-box">
      <div class="title">EL ARRENDADOR</div>
      <div class="signature-line"></div>
      <div><strong>EUROCAR RENTAL SAS</strong></div>
      <div>NIT: 900269555</div>
    </div>
  </div>

  <div class="footer">
    ${data.es_preliminar 
      ? 'Este es un documento preliminar enviado para revisión. Para formalizar el contrato debe completar el proceso de firma digital.'
      : 'El presente documento se firma por medio de firma digital, acompañado de huella digital y foto para demostrar la autenticidad.'
    }
    <br><br>
    EUROCAR RENTAL SAS | AV CALLE 26 69C-03 LOCAL 105 | BOGOTÁ - COLOMBIA | www.eurocarental.com
  </div>
</body>
</html>
  `;
};

export default generateContractHTML;
