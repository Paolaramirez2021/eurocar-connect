import { supabase } from "@/integrations/supabase/client";

export type AuditActionType = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_SIGNUP'
  | 'USER_UPDATE'
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'VEHICLE_CREATE'
  | 'VEHICLE_UPDATE'
  | 'VEHICLE_DELETE'
  | 'RENTAL_CREATE'
  | 'RENTAL_UPDATE'
  | 'RENTAL_DELETE'
  | 'RENTAL_DELIVERY'
  | 'RENTAL_RETURN'
  | 'MAINTENANCE_CREATE'
  | 'MAINTENANCE_UPDATE'
  | 'PAYMENT_CREATE'
  | 'REVERSAL'
  | 'SHIFT_START'
  | 'SHIFT_END'
  | 'CHECKLIST_TEMPLATE_CREATE'
  | 'CHECKLIST_TEMPLATE_IMPORT'
  | 'CHECKLIST_DELIVERY'
  | 'CHECKLIST_RETURN'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_UPDATE'
  | 'RESERVATION_CANCEL'
  | 'ALERT_RESOLVED'
  | 'MAINTENANCE_SCHEDULE_UPDATE'
  | 'FINANCE_ITEM_CREATE'
  | 'AGENT_CREATE'
  | 'AGENT_UPDATE'
  | 'RESERVATION_FINALIZE'
  | 'MAINTENANCE_ALERT_RESOLVED'
  | 'SECURITY_ALERT_CREATED';

interface LogAuditParams {
  actionType: AuditActionType;
  tableName?: string;
  recordId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  description?: string;
}

export const logAudit = async ({
  actionType,
  tableName,
  recordId,
  oldData,
  newData,
  description
}: LogAuditParams) => {
  try {
    const { data, error } = await supabase.rpc('log_audit', {
      p_action_type: actionType,
      p_table_name: tableName || null,
      p_record_id: recordId || null,
      p_old_data: oldData ? JSON.stringify(oldData) : null,
      p_new_data: newData ? JSON.stringify(newData) : null,
      p_description: description || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging audit:', error);
    throw error;
  }
};

export const getAuditLogs = async (filters?: {
  actionType?: AuditActionType;
  tableName?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) => {
  try {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.tableName) {
      query = query.eq('table_name', filters.tableName);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};
