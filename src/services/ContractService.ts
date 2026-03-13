import { supabase } from '@/integrations/supabase/client';

export interface ContractGenerationData {
  reservation_id: string;
  cliente_nombre: string;
  cliente_documento: string;
  cliente_licencia: string;
  cliente_direccion: string;
  cliente_telefono: string;
  cliente_ciudad: string;
  cliente_email: string;
  conductor2_nombre?: string;
  conductor2_documento?: string;
  conductor2_licencia?: string;
  conductor2_vencimiento?: string;
  vehiculo_marca: string;
  vehiculo_placa: string;
  vehiculo_color: string;
  vehiculo_km_salida: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  hora_inicio: string;
  hora_terminacion: string;
  tarifa_diaria: number;
  subtotal: number;
  descuento: number;
  iva: number;
  valor_total: number;
  valor_reserva?: number;
  forma_pago: string;
  firma_cliente_base64?: string;
  huella_cliente_base64?: string;
  foto_cliente_base64?: string;
}

export class ContractService {
  /**
   * Crea un nuevo contrato en la base de datos
   */
  static async createContract(data: ContractGenerationData) {
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert({
          reservation_id: data.reservation_id,
          cliente_nombre: data.cliente_nombre,
          cliente_documento: data.cliente_documento,
          cliente_email: data.cliente_email,
          vehiculo_placa: data.vehiculo_placa,
          fecha_inicio: data.fecha_inicio,
          fecha_fin: data.fecha_fin,
          valor_total: data.valor_total,
          estado: 'pendiente',
          ip_address: await this.getClientIP(),
          metadata: {
            ...data,
            fecha_creacion: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;
      return contract;
    } catch (error: any) {
      console.error('[ContractService] Error creando contrato:', error);
      throw new Error(`Error al crear contrato: ${error.message}`);
    }
  }

  /**
   * Sube imagen a Supabase Storage
   */
  static async uploadImage(
    base64Data: string,
    folder: 'signatures' | 'fingerprints' | 'photos',
    filename: string
  ): Promise<string> {
    try {
      // Convertir base64 a blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();

      const path = `contracts/${folder}/${filename}`;

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(path, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: publicURL } = supabase.storage
        .from('contracts')
        .getPublicUrl(path);

      return publicURL.publicUrl;
    } catch (error: any) {
      console.error('[ContractService] Error subiendo imagen:', error);
      throw new Error(`Error al subir imagen: ${error.message}`);
    }
  }

  /**
   * Sube el PDF del contrato a Supabase Storage
   */
  static async uploadContractPDF(
    pdfBlob: Blob,
    contractId: string
  ): Promise<string> {
    try {
      const filename = `${contractId}_${Date.now()}.pdf`;
      const path = `contracts/pdf/${filename}`;

      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(path, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: publicURL } = supabase.storage
        .from('contracts')
        .getPublicUrl(path);

      return publicURL.publicUrl;
    } catch (error: any) {
      console.error('[ContractService] Error subiendo PDF:', error);
      throw new Error(`Error al subir PDF: ${error.message}`);
    }
  }

  /**
   * Actualiza el contrato con las URLs de firma, huella y PDF
   */
  static async updateContractWithAssets(
    contractId: string,
    updates: {
      firma_url?: string;
      huella_url?: string;
      foto_url?: string;
      pdf_url?: string;
      estado?: string;
    }
  ) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[ContractService] Error actualizando contrato:', error);
      throw new Error(`Error al actualizar contrato: ${error.message}`);
    }
  }

  /**
   * Genera HTML del contrato renderizado
   */
  static async generateContractHTML(data: ContractGenerationData): Promise<string> {
    // Esta función será llamada desde el componente React
    // que renderiza el ContractTemplate
    return '';
  }

  /**
   * Envía el contrato por email
   */
  static async sendContractEmail(
    clientEmail: string,
    contractPdfUrl: string,
    contractData: any
  ) {
    try {
      console.log('[ContractService] Enviando email a:', clientEmail);
      
      // Llamar al backend API (usa /api que es redirigido por Kubernetes ingress)
      const response = await fetch('/api/send-contract-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [clientEmail, 'reservas@contact.eurocarental.com'],
          contract_pdf_url: contractPdfUrl,
          contract_data: contractData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error enviando email');
      }

      const result = await response.json();
      console.log('[ContractService] Email enviado:', result);
      
      return result;
    } catch (error: any) {
      console.error('[ContractService] Error enviando email:', error);
      throw new Error(`Error al enviar email: ${error.message}`);
    }
  }

  /**
   * Obtiene la IP del cliente
   */
  static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Proceso completo: Crear contrato, subir assets y generar PDF
   */
  static async processContract(data: ContractGenerationData): Promise<{
    contract: any;
    pdfUrl: string;
  }> {
    try {
      console.log('[ContractService] Iniciando procesamiento de contrato...');

      // 1. Crear contrato en BD
      const contract = await this.createContract(data);
      console.log('[ContractService] Contrato creado:', contract.id);

      // 2. Subir firma si existe
      let firmaUrl = '';
      if (data.firma_cliente_base64) {
        firmaUrl = await this.uploadImage(
          data.firma_cliente_base64,
          'signatures',
          `${contract.id}_firma.png`
        );
        console.log('[ContractService] Firma subida');
      }

      // 3. Subir huella si existe
      let huellaUrl = '';
      if (data.huella_cliente_base64) {
        huellaUrl = await this.uploadImage(
          data.huella_cliente_base64,
          'fingerprints',
          `${contract.id}_huella.png`
        );
        console.log('[ContractService] Huella subida');
      }

      // 4. Subir foto si existe
      let fotoUrl = '';
      if (data.foto_cliente_base64) {
        fotoUrl = await this.uploadImage(
          data.foto_cliente_base64,
          'photos',
          `${contract.id}_foto.jpg`
        );
        console.log('[ContractService] Foto subida');
      }

      // 5. Actualizar contrato con URLs de assets
      await this.updateContractWithAssets(contract.id, {
        firma_url: firmaUrl,
        huella_url: huellaUrl,
        foto_url: fotoUrl
      });

      console.log('[ContractService] Contrato procesado exitosamente');

      return {
        contract,
        pdfUrl: '' // Se generará después desde el frontend
      };
    } catch (error: any) {
      console.error('[ContractService] Error procesando contrato:', error);
      throw error;
    }
  }

  /**
   * Obtiene un contrato por ID
   */
  static async getContract(contractId: string) {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[ContractService] Error obteniendo contrato:', error);
      throw new Error(`Error al obtener contrato: ${error.message}`);
    }
  }

  /**
   * Lista todos los contratos
   */
  static async listContracts(filters?: {
    reservation_id?: string;
    cliente_documento?: string;
    estado?: string;
  }) {
    try {
      let query = supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.reservation_id) {
        query = query.eq('reservation_id', filters.reservation_id);
      }
      if (filters?.cliente_documento) {
        query = query.eq('cliente_documento', filters.cliente_documento);
      }
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('[ContractService] Error listando contratos:', error);
      throw new Error(`Error al listar contratos: ${error.message}`);
    }
  }
}
