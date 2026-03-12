import React from 'react';

interface ContractData {
  // Cliente
  cliente_nombre: string;
  cliente_documento: string;
  cliente_licencia: string;
  cliente_direccion: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_email: string;
  
  // Conductores adicionales
  conductor2_nombre?: string;
  conductor2_documento?: string;
  conductor2_licencia?: string;
  conductor2_vencimiento?: string;
  
  // Vehículo
  vehiculo_marca: string;
  vehiculo_placa: string;
  vehiculo_color: string;
  vehiculo_km_salida: number;
  
  // Contrato
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  hora_inicio: string;
  hora_terminacion: string;
  
  // Valores
  tarifa_diaria: number;
  subtotal: number;
  descuento: number;
  iva: number;
  valor_total: number;
  valor_reserva?: number;
  forma_pago: string;
  
  // Firmas
  firma_cliente_url?: string;
  huella_cliente_url?: string;
  foto_cliente_url?: string;
  fecha_firma: string;
  
  // Metadata
  contrato_numero?: string;
  ip_address?: string;
}

interface ContractTemplateProps {
  data: ContractData;
  forPDF?: boolean;
}

export const ContractTemplate: React.FC<ContractTemplateProps> = ({ data, forPDF = false }) => {
  const styles = `
    @page {
      size: letter;
      margin: 1cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
    }
    
    .contract-container {
      max-width: 21cm;
      margin: 0 auto;
      padding: ${forPDF ? '0' : '20px'};
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1e40af;
    }
    
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    
    .header h2 {
      font-size: 12pt;
      color: #666;
      font-weight: normal;
    }
    
    .contract-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin: 20px 0;
      text-transform: uppercase;
    }
    
    .contract-number {
      text-align: right;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
      font-size: 9pt;
    }
    
    th {
      background-color: #e5e7eb;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .section-title {
      background-color: #d1d5db;
      font-weight: bold;
      padding: 8px;
    }
    
    .clausulas {
      margin: 20px 0;
    }
    
    .clausulas h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .clausula {
      margin-bottom: 10px;
      text-align: justify;
    }
    
    .clausula strong {
      font-weight: bold;
    }
    
    .firma-note {
      margin: 20px 0;
      padding: 10px;
      background-color: #f3f4f6;
      font-style: italic;
      font-size: 9pt;
      border-left: 3px solid #1e40af;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    
    .signature-block {
      width: 48%;
      text-align: center;
    }
    
    .signature-title {
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .signature-box {
      border: 1px solid #000;
      min-height: 80px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
    }
    
    .signature-box img {
      max-width: 100%;
      max-height: 70px;
    }
    
    .signature-info {
      font-size: 9pt;
      margin-top: 5px;
    }
    
    .fingerprint-box {
      border: 1px solid #000;
      width: 80px;
      height: 80px;
      margin: 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
    }
    
    .fingerprint-box img {
      max-width: 100%;
      max-height: 100%;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .font-bold {
      font-weight: bold;
    }
    
    @media print {
      .contract-container {
        padding: 0;
      }
    }
  `;

  return (
    <div>
      {forPDF && <style>{styles}</style>}
      <div className={forPDF ? 'contract-container' : 'contract-container max-w-4xl mx-auto bg-white shadow-lg'}>
        {/* Header */}
        <div className="header">
          <h1>EUROCAR RENTAL</h1>
          <h2>ALQUILER DE VEHÍCULOS</h2>
        </div>

        {/* Contract Title */}
        <div className="contract-title">
          CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR
        </div>

        {data.contrato_numero && (
          <div className="contract-number">
            No. {data.contrato_numero}
          </div>
        )}

        {/* Section 1: Identificación */}
        <table>
          <thead>
            <tr>
              <th colSpan={2} className="section-title">1. IDENTIFICACIÓN</th>
              <th colSpan={2} className="text-center">EL ARRENDATARIO</th>
              <th colSpan={2} className="text-center">EL ARRENDADOR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">NOMBRE/RAZÓN SOCIAL</td>
              <td colSpan={2}>{data.cliente_nombre}</td>
              <td colSpan={3}>EUROCAR RENTAL SAS</td>
            </tr>
            <tr>
              <td className="font-bold">DOCUMENTO IDENTIDAD</td>
              <td colSpan={2}>{data.cliente_documento}</td>
              <td colSpan={3}>900269555</td>
            </tr>
            <tr>
              <td className="font-bold">LICENCIA CONDUCCIÓN</td>
              <td colSpan={2}>{data.cliente_licencia}</td>
              <td colSpan={3}>-</td>
            </tr>
            <tr>
              <td className="font-bold">DIRECCIÓN</td>
              <td colSpan={2}>{data.cliente_direccion}</td>
              <td colSpan={3}>AV CALLE 26 69C-03 LOCAL 105</td>
            </tr>
            <tr>
              <td className="font-bold">TELÉFONO</td>
              <td colSpan={2}>{data.cliente_telefono}</td>
              <td colSpan={3}>3208341163-3132094156</td>
            </tr>
            <tr>
              <td className="font-bold">CIUDAD/PAÍS</td>
              <td colSpan={2}>{data.cliente_ciudad}</td>
              <td colSpan={3}>BOGOTÁ-COLOMBIA</td>
            </tr>
            <tr>
              <td className="font-bold">CORREO ELECTRÓNICO</td>
              <td colSpan={2}>{data.cliente_email}</td>
              <td colSpan={3}>JENNYGOMEZ@EUROCARENTAL.COM</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: Conductores */}
        <table>
          <thead>
            <tr>
              <th colSpan={2} className="section-title">2. CONDUCTORES</th>
              <th>DOCUMENTO IDENTIDAD</th>
              <th>N. LICENCIA</th>
              <th>VENCIMIENTO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">1</td>
              <td>{data.cliente_nombre}</td>
              <td>{data.cliente_documento}</td>
              <td>{data.cliente_licencia}</td>
              <td>-</td>
            </tr>
            {data.conductor2_nombre && (
              <tr>
                <td className="font-bold">2</td>
                <td>{data.conductor2_nombre}</td>
                <td>{data.conductor2_documento || '-'}</td>
                <td>{data.conductor2_licencia || '-'}</td>
                <td>{data.conductor2_vencimiento || '-'}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Section 3: Vehículo */}
        <table>
          <thead>
            <tr>
              <th className="section-title">3. VEHÍCULO</th>
              <th>MARCA</th>
              <th>PLACA</th>
              <th>COLOR</th>
              <th>KM SALIDA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td></td>
              <td>{data.vehiculo_marca}</td>
              <td>{data.vehiculo_placa}</td>
              <td>{data.vehiculo_color}</td>
              <td>{data.vehiculo_km_salida}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 4: Duración del Contrato */}
        <table>
          <thead>
            <tr>
              <th colSpan={3} className="section-title">4. DURACIÓN DEL CONTRATO</th>
              <th colSpan={3} className="text-center">FECHA INICIO</th>
              <th colSpan={3} className="text-center">FECHA TERMINACIÓN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">DÍAS</td>
              <td colSpan={2}>{data.dias_totales}</td>
              <td colSpan={3}>{data.fecha_inicio}</td>
              <td colSpan={3}>{data.fecha_fin}</td>
            </tr>
            <tr>
              <td className="font-bold">HORA INICIO</td>
              <td colSpan={2}>{data.hora_inicio}</td>
              <td className="font-bold">HORA TERMINACIÓN</td>
              <td colSpan={2}>{data.hora_terminacion}</td>
              <td colSpan={3}></td>
            </tr>
            <tr>
              <td colSpan={3}>Servicio a viajar</td>
              <td colSpan={6}>Término contrato: 2 días - 400kms/km adicional $ 3.000</td>
            </tr>
          </tbody>
        </table>

        {/* Section 5: Valor del Contrato */}
        <table>
          <thead>
            <tr>
              <th colSpan={2} className="section-title">5. VALOR DEL CONTRATO</th>
              <th>VALOR DÍA</th>
              <th>SUBTOTAL</th>
              <th>DTO</th>
              <th>IVA 19%</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">VALOR DÍAS</td>
              <td>{data.dias_totales}</td>
              <td>${data.tarifa_diaria.toLocaleString('es-CO')}</td>
              <td>${data.subtotal.toLocaleString('es-CO')}</td>
              <td>${data.descuento.toLocaleString('es-CO')}</td>
              <td>${data.iva.toLocaleString('es-CO')}</td>
              <td>${data.valor_total.toLocaleString('es-CO')}</td>
            </tr>
            <tr>
              <td className="font-bold">VALOR ADICIONAL</td>
              <td colSpan={6}>$0</td>
            </tr>
            <tr>
              <td className="font-bold">TOTAL CONTRATO</td>
              <td colSpan={3}>${data.valor_total.toLocaleString('es-CO')}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        {/* Section 6: Valor Reserva */}
        <table>
          <thead>
            <tr>
              <th className="section-title">6. VALOR RESERVA RECIBIDA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${(data.valor_reserva || 0).toLocaleString('es-CO')}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 7: Forma de Pago */}
        <table>
          <thead>
            <tr>
              <th className="section-title">7. FORMA DE PAGO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.forma_pago}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 8: Cláusulas y Condiciones */}
        <div className="clausulas">
          <h3>8. CLÁUSULAS Y CONDICIONES</h3>
          
          <div className="clausula">
            <strong>A.</strong> En caso de accidente: si es choque simple comunicarse de inmediato con EL ARRENDADOR, seguir indicaciones del funcionario. Si es choque complejo comunicarse de inmediato con EL ARRENDADOR solicitar intervención de autoridades de tránsito y por ningún motivo haga arreglos al vehículo.
          </div>

          <div className="clausula">
            <strong>B.</strong> El ARRENDATARIO se compromete a responder por multas, comparendos o inmovilizaciones ocasionados durante el periodo de renta y debe pagar el valor total de la sanción más 10% por gastos administrativos.
          </div>

          <div className="clausula">
            <strong>C.</strong> La cancelación de la reserva tiene una penalidad equivalente al 30% del valor total de la renta.
          </div>

          <div className="clausula">
            <strong>D.</strong> El valor de la hora adicional es el 10% de la tarifa día, a partir de la quinta (5) hora adicional se cobrará el día completo.
          </div>

          <div className="clausula">
            <strong>E.</strong> En caso de que EL ARRENDATARIO haga entrega del vehículo antes del tiempo pactado en el contrato no habrá devolución de dinero.
          </div>

          <div className="clausula">
            <strong>F.</strong> El vehículo se entrega limpio y full de combustible EL ARRENDATARIO debe regresarlo en las mismas condiciones de lo contrario se aplicará un sobrecosto por esos conceptos.
          </div>

          <div className="clausula">
            <strong>G.</strong> En caso de extender la renta, EL ARRENDATARIO debe informar con anticipación a EL ARRENDADOR y realizar el pago correspondiente.
          </div>

          <div className="clausula">
            <strong>H.</strong> Evite fumar dentro del vehículo, de lo contrario debe asumir el costo del lavado de la tapicería.
          </div>

          <div className="clausula">
            <strong>I.</strong> SEGUROS El seguro no tiene cobertura si el vehículo es utilizado para trabajar con plataformas, piques, pruebas de seguridad o manejo defensivo, tampoco tiene cobertura por maltrato al vehículo, robo de accesorios, ni lucro cesante por tiempo de inutilidad por mal uso. Será total responsabilidad por parte de EL ARRENDATARIO si el vehículo es usado bajo efectos de alcohol o sustancias psicoactivas, o por uso en actividades ilícitas. El seguro tiene una protección del 80% del valor comercial del vehículo, quedando a cargo de EL ARRENDATARIO el 20% no cubierto por la póliza con un deducible mínimo de acuerdo a la tabla de la aseguradora. EL ARRENDATARIO ACEPTA los seguros, cláusulas y condiciones estipuladas en el presente contrato y autoriza a EL ARRENDADOR para hacer uso de la garantía o descontar de la tarjeta de crédito de EL ARRENDATARIO el valor causado por cualquiera de estos conceptos.
          </div>

          <div className="clausula">
            <strong>J.</strong> El ARRENDATARIO autoriza a EL ARRENDADOR al tratamiento sus datos personales conforme a la ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas concordantes, de acuerdo a las políticas de tratamiento de datos que se encuentran en www.eurocarental.com
          </div>

          <div className="clausula">
            <strong>K.</strong> EL ARRENDATARIO acepta que conoce los términos y condiciones que se encuentran en www.eurocarental.com
          </div>
        </div>

        {/* Firma Note */}
        <div className="firma-note">
          El presente documento lo firma el ARRENDATARIO por medio de firma simple (trazo manual digitalizado), acompañado de huella digital y foto para demostrar la autenticidad de la persona, además se identifica la IP, fecha, hora y se envía al correo electrónico de el ARRENDATARIO la copia de este contrato.
        </div>

        {/* Signatures Section */}
        <div className="signatures">
          {/* Arrendatario */}
          <div className="signature-block">
            <div className="signature-title">EL ARRENDATARIO</div>
            
            <div className="signature-box">
              {data.firma_cliente_url ? (
                <img src={data.firma_cliente_url} alt="Firma del Cliente" />
              ) : (
                <span style={{ color: '#999' }}>Firma</span>
              )}
            </div>
            
            <div className="fingerprint-box">
              {data.huella_cliente_url ? (
                <img src={data.huella_cliente_url} alt="Huella del Cliente" />
              ) : (
                <span style={{ color: '#999', fontSize: '8pt' }}>Huella</span>
              )}
            </div>
            
            <div className="signature-info">
              <div>Cédula: {data.cliente_documento}</div>
              <div>Nombre: {data.cliente_nombre}</div>
              <div>Fecha: {data.fecha_firma}</div>
              {data.ip_address && <div>IP: {data.ip_address}</div>}
            </div>
          </div>

          {/* Arrendador */}
          <div className="signature-block">
            <div className="signature-title">EL ARRENDADOR</div>
            
            <div className="signature-box">
              <span style={{ color: '#999' }}>Firma Digital</span>
            </div>
            
            <div className="signature-info" style={{ marginTop: '90px' }}>
              <div>NIT: 900269555</div>
              <div>EUROCAR RENTAL SAS</div>
              <div>Representante Legal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
