export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          estado: string | null
          id: string
          is_resolved: boolean
          mensaje: string
          meta: Json | null
          priority: string
          recipients_roles: string[]
          resolved_at: string | null
          resolved_by: string | null
          tipo: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          estado?: string | null
          id?: string
          is_resolved?: boolean
          mensaje: string
          meta?: Json | null
          priority?: string
          recipients_roles?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          tipo: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          estado?: string | null
          id?: string
          is_resolved?: boolean
          mensaje?: string
          meta?: Json | null
          priority?: string
          recipients_roles?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          tipo?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts_maintenance: {
        Row: {
          created_at: string
          descripcion: string
          estado: string
          fecha_evento: string
          id: string
          tipo_alerta: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          estado?: string
          fecha_evento: string
          id?: string
          tipo_alerta: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_evento?: string
          id?: string
          tipo_alerta?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          estado: string | null
          foto_url: string | null
          id: string
          key: string
          label: string
          observaciones: string | null
          template_item_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          key: string
          label: string
          observaciones?: string | null
          template_item_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          estado?: string | null
          foto_url?: string | null
          id?: string
          key?: string
          label?: string
          observaciones?: string | null
          template_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          order_index: number
          required: boolean
          template_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          order_index?: number
          required?: boolean
          template_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          order_index?: number
          required?: boolean
          template_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          completed_at: string
          completed_by: string
          created_at: string
          id: string
          kms_registro: number | null
          observaciones_generales: string | null
          rental_id: string | null
          status: string
          template_id: string
          type: string
          vehicle_id: string
        }
        Insert: {
          completed_at?: string
          completed_by: string
          created_at?: string
          id?: string
          kms_registro?: number | null
          observaciones_generales?: string | null
          rental_id?: string | null
          status?: string
          template_id: string
          type: string
          vehicle_id: string
        }
        Update: {
          completed_at?: string
          completed_by?: string
          created_at?: string
          id?: string
          kms_registro?: number | null
          observaciones_generales?: string | null
          rental_id?: string | null
          status?: string
          template_id?: string
          type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_number: string
          created_at: string
          customer_document: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          end_date: string
          fingerprint_url: string | null
          id: string
          ip_address: string | null
          is_locked: boolean
          pdf_url: string | null
          reservation_id: string | null
          signature_url: string
          signed_at: string
          signed_by: string | null
          start_date: string
          status: string
          synced_at: string | null
          terms_accepted: boolean
          terms_text: string
          total_amount: number
          updated_at: string
          user_agent: string | null
          vehicle_id: string
          was_offline: boolean
        }
        Insert: {
          contract_number: string
          created_at?: string
          customer_document: string
          customer_email?: string | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          end_date: string
          fingerprint_url?: string | null
          id?: string
          ip_address?: string | null
          is_locked?: boolean
          pdf_url?: string | null
          reservation_id?: string | null
          signature_url: string
          signed_at?: string
          signed_by?: string | null
          start_date: string
          status?: string
          synced_at?: string | null
          terms_accepted?: boolean
          terms_text: string
          total_amount: number
          updated_at?: string
          user_agent?: string | null
          vehicle_id: string
          was_offline?: boolean
        }
        Update: {
          contract_number?: string
          created_at?: string
          customer_document?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          end_date?: string
          fingerprint_url?: string | null
          id?: string
          ip_address?: string | null
          is_locked?: boolean
          pdf_url?: string | null
          reservation_id?: string | null
          signature_url?: string
          signed_at?: string
          signed_by?: string | null
          start_date?: string
          status?: string
          synced_at?: string | null
          terms_accepted?: boolean
          terms_text?: string
          total_amount?: number
          updated_at?: string
          user_agent?: string | null
          vehicle_id?: string
          was_offline?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alerta_cliente: string | null
          banco: string | null
          cedula_pasaporte: string
          celular: string
          ciudad: string | null
          created_at: string
          created_by: string | null
          direccion_oficina: string | null
          direccion_residencia: string | null
          email: string | null
          empresa: string | null
          estado: string | null
          estado_civil: string | null
          fecha_nacimiento: string | null
          foto_documento_url: string | null
          hotel_hospedaje: string | null
          hotel_numero_habitacion: string | null
          id: string
          licencia_ciudad_expedicion: string | null
          licencia_fecha_vencimiento: string | null
          licencia_numero: string | null
          monto_total: number | null
          nombres: string
          numero_tarjeta: string | null
          observaciones: string | null
          ocupacion: string | null
          pais: string | null
          primer_apellido: string
          referencia_comercial_nombre: string | null
          referencia_comercial_telefono: string | null
          referencia_familiar_nombre: string | null
          referencia_familiar_telefono: string | null
          referencia_personal_nombre: string | null
          referencia_personal_telefono: string | null
          segundo_apellido: string | null
          telefono: string | null
          total_reservas: number | null
          updated_at: string
        }
        Insert: {
          alerta_cliente?: string | null
          banco?: string | null
          cedula_pasaporte: string
          celular: string
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          direccion_oficina?: string | null
          direccion_residencia?: string | null
          email?: string | null
          empresa?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          foto_documento_url?: string | null
          hotel_hospedaje?: string | null
          hotel_numero_habitacion?: string | null
          id?: string
          licencia_ciudad_expedicion?: string | null
          licencia_fecha_vencimiento?: string | null
          licencia_numero?: string | null
          monto_total?: number | null
          nombres: string
          numero_tarjeta?: string | null
          observaciones?: string | null
          ocupacion?: string | null
          pais?: string | null
          primer_apellido: string
          referencia_comercial_nombre?: string | null
          referencia_comercial_telefono?: string | null
          referencia_familiar_nombre?: string | null
          referencia_familiar_telefono?: string | null
          referencia_personal_nombre?: string | null
          referencia_personal_telefono?: string | null
          segundo_apellido?: string | null
          telefono?: string | null
          total_reservas?: number | null
          updated_at?: string
        }
        Update: {
          alerta_cliente?: string | null
          banco?: string | null
          cedula_pasaporte?: string
          celular?: string
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          direccion_oficina?: string | null
          direccion_residencia?: string | null
          email?: string | null
          empresa?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_nacimiento?: string | null
          foto_documento_url?: string | null
          hotel_hospedaje?: string | null
          hotel_numero_habitacion?: string | null
          id?: string
          licencia_ciudad_expedicion?: string | null
          licencia_fecha_vencimiento?: string | null
          licencia_numero?: string | null
          monto_total?: number | null
          nombres?: string
          numero_tarjeta?: string | null
          observaciones?: string | null
          ocupacion?: string | null
          pais?: string | null
          primer_apellido?: string
          referencia_comercial_nombre?: string | null
          referencia_comercial_telefono?: string | null
          referencia_familiar_nombre?: string | null
          referencia_familiar_telefono?: string | null
          referencia_personal_nombre?: string | null
          referencia_personal_telefono?: string | null
          segundo_apellido?: string | null
          telefono?: string | null
          total_reservas?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      devolucion_videos: {
        Row: {
          checklist_id: string | null
          created_at: string
          duracion_segundos: number | null
          fecha_devolucion: string
          filename: string
          google_drive_file_id: string | null
          google_drive_url: string
          id: string
          reservation_id: string | null
          tamaño_bytes: number | null
          updated_at: string
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          duracion_segundos?: number | null
          fecha_devolucion?: string
          filename: string
          google_drive_file_id?: string | null
          google_drive_url: string
          id?: string
          reservation_id?: string | null
          tamaño_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          duracion_segundos?: number | null
          fecha_devolucion?: string
          filename?: string
          google_drive_file_id?: string | null
          google_drive_url?: string
          id?: string
          reservation_id?: string | null
          tamaño_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucion_videos_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_videos_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucion_videos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_items: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          ref_id: string | null
          type: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          type: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          ref_id?: string | null
          type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_zones: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_zones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance: {
        Row: {
          completed: boolean | null
          costo: number
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          kms: number | null
          tipo: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          completed?: boolean | null
          costo: number
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          kms?: number | null
          tipo: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          completed?: boolean | null
          costo?: number
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          kms?: number | null
          tipo?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          created_at: string
          id: string
          interval_days: number | null
          interval_km: number | null
          is_active: boolean
          last_change_date: string | null
          last_change_km: number | null
          next_due_date: string | null
          next_due_km: number | null
          tipo: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          last_change_date?: string | null
          last_change_km?: number | null
          next_due_date?: string | null
          next_due_km?: number | null
          tipo: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          last_change_date?: string | null
          last_change_km?: number | null
          next_due_date?: string | null
          next_due_km?: number | null
          tipo?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          status?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pico_placa_payments: {
        Row: {
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          monto: number | null
          notas: string | null
          pagado: boolean
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha: string
          id?: string
          monto?: number | null
          notas?: string | null
          pagado?: boolean
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          monto?: number | null
          notas?: string | null
          pagado?: boolean
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pico_placa_payments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cedula: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cedula?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name: string
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cedula?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          auto_cancel_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cliente_contacto: string
          cliente_documento: string | null
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          descuento: number | null
          descuento_porcentaje: number | null
          dias_totales: number | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          notas: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_status: string | null
          price_total: number | null
          refund_date: string | null
          refund_reference: string | null
          refund_status: string | null
          source: string | null
          tarifa_dia_iva: number | null
          updated_at: string
          valor_total: number | null
          vehicle_id: string
        }
        Insert: {
          auto_cancel_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cliente_contacto: string
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          contract_id?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          descuento?: number | null
          descuento_porcentaje?: number | null
          dias_totales?: number | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          price_total?: number | null
          refund_date?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          source?: string | null
          tarifa_dia_iva?: number | null
          updated_at?: string
          valor_total?: number | null
          vehicle_id: string
        }
        Update: {
          auto_cancel_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cliente_contacto?: string
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          descuento?: number | null
          descuento_porcentaje?: number | null
          dias_totales?: number | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          price_total?: number | null
          refund_date?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          source?: string | null
          tarifa_dia_iva?: number | null
          updated_at?: string
          valor_total?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          method: string
          notes: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          method: string
          notes?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          method?: string
          notes?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          año: number
          capacidad_pasajeros: number | null
          cilindraje: number | null
          color: string | null
          combustible: string | null
          created_at: string
          equipamiento: string | null
          estado: string
          fecha_impuestos: string | null
          fecha_soat: string | null
          fecha_tecnomecanica: string | null
          id: string
          kilometraje_actual: number
          kilometraje_dia: number | null
          kilometraje_proximo_mantenimiento: number | null
          marca: string
          modelo: string
          observaciones: string | null
          placa: string
          tarifa_dia_iva: number | null
          tipo_caja: string | null
          ultimo_cambio_aceite_km: number | null
          ultimo_cambio_llantas_km: number | null
          ultimo_cambio_pastillas_km: number | null
          updated_at: string
        }
        Insert: {
          año: number
          capacidad_pasajeros?: number | null
          cilindraje?: number | null
          color?: string | null
          combustible?: string | null
          created_at?: string
          equipamiento?: string | null
          estado?: string
          fecha_impuestos?: string | null
          fecha_soat?: string | null
          fecha_tecnomecanica?: string | null
          id?: string
          kilometraje_actual?: number
          kilometraje_dia?: number | null
          kilometraje_proximo_mantenimiento?: number | null
          marca: string
          modelo: string
          observaciones?: string | null
          placa: string
          tarifa_dia_iva?: number | null
          tipo_caja?: string | null
          ultimo_cambio_aceite_km?: number | null
          ultimo_cambio_llantas_km?: number | null
          ultimo_cambio_pastillas_km?: number | null
          updated_at?: string
        }
        Update: {
          año?: number
          capacidad_pasajeros?: number | null
          cilindraje?: number | null
          color?: string | null
          combustible?: string | null
          created_at?: string
          equipamiento?: string | null
          estado?: string
          fecha_impuestos?: string | null
          fecha_soat?: string | null
          fecha_tecnomecanica?: string | null
          id?: string
          kilometraje_actual?: number
          kilometraje_dia?: number | null
          kilometraje_proximo_mantenimiento?: number | null
          marca?: string
          modelo?: string
          observaciones?: string | null
          placa?: string
          tarifa_dia_iva?: number | null
          tipo_caja?: string | null
          ultimo_cambio_aceite_km?: number | null
          ultimo_cambio_llantas_km?: number | null
          ultimo_cambio_pastillas_km?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      alerts_maintenance_view: {
        Row: {
          created_at: string | null
          descripcion: string | null
          dias_restantes: number | null
          estado: string | null
          fecha_evento: string | null
          id: string | null
          tipo_alerta: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          dias_restantes?: never
          estado?: string | null
          fecha_evento?: string | null
          id?: string | null
          tipo_alerta?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          dias_restantes?: never
          estado?: string | null
          fecha_evento?: string | null
          id?: string | null
          tipo_alerta?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stats: {
        Row: {
          cedula_pasaporte: string | null
          celular: string | null
          contratos_firmados: number | null
          created_at: string | null
          email: string | null
          estado: string | null
          id: string | null
          monto_total: number | null
          nombres: string | null
          primer_apellido: string | null
          reservas_activas: number | null
          reservas_completadas: number | null
          segundo_apellido: string | null
          total_reservas: number | null
          ultima_reserva: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_maintenance_alerts: { Args: never; Returns: undefined }
      check_reservation_availability: {
        Args: {
          p_exclude_reservation_id?: string
          p_fecha_fin: string
          p_fecha_inicio: string
          p_vehicle_id: string
        }
        Returns: boolean
      }
      generate_contract_number: { Args: never; Returns: string }
      generate_date_alerts: { Args: never; Returns: undefined }
      generate_km_alerts: { Args: never; Returns: undefined }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_within_geofence: {
        Args: { p_latitude: number; p_longitude: number; p_zone_id?: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          p_action_type: string
          p_description?: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name?: string
        }
        Returns: string
      }
      mark_maintenance_alert_resolved: {
        Args: { p_alert_id: string; p_descripcion?: string }
        Returns: undefined
      }
      notify_admins: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      resolve_alert: {
        Args: { p_alert_id: string; p_descripcion?: string }
        Returns: undefined
      }
      update_alerts_estado: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "socio_principal" | "administrador" | "comercial" | "operativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["socio_principal", "administrador", "comercial", "operativo"],
    },
  },
} as const
