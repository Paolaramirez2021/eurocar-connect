/**
 * Configuración centralizada de estados de reservas - COMPATIBLE CON BD
 * 
 * IMPORTANTE: Usa los estados nativos de Supabase para compatibilidad con triggers:
 * - pending: Reserva pendiente
 * - confirmed: Contrato firmado, vehículo en uso
 * - completed: Reserva completada
 * - cancelled: Reserva cancelada
 * - expired: Expirada por falta de pago
 * 
 * El campo payment_status determina si hay pago o no:
 * - pending + payment_status='pending' = Sin pago (amarillo)
 * - pending + payment_status='paid' = Con pago (verde)
 */

// Estados nativos de la BD de Supabase
export type ReservationStatus = 
  | 'pending'      // Estado inicial - sin pago
  | 'confirmed'    // Contrato firmado, vehículo entregado
  | 'completed'    // Vehículo devuelto
  | 'cancelled'    // Cancelada
  | 'expired';     // Expiró por falta de pago

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface StateConfig {
  label: string;
  description: string;
  badgeClass: string;
  calendarClass: string;
  colorHex: string;
  isActive: boolean;
  includeInRevenue: boolean;
  occupiesVehicle: boolean;
  hasAutoCancelTimer: boolean;
  sortPriority: number;
}

/**
 * Configuración de estados - usando estados nativos de BD
 */
export const RESERVATION_STATES: Record<string, StateConfig> = {
  // ============================================
  // ESTADOS ACTIVOS - Ocupan vehículo
  // ============================================
  
  confirmed: {
    label: 'Confirmado (Rentado)',
    description: 'Contrato firmado, vehículo en uso',
    badgeClass: 'bg-red-500 text-white hover:bg-red-600',
    calendarClass: 'bg-red-500 hover:bg-red-600',
    colorHex: '#ef4444',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 1,
  },
  
  // pending + paid = Con pago (verde)
  pending_paid: {
    label: 'Con Pago',
    description: 'Reserva pagada, pendiente de contrato',
    badgeClass: 'bg-green-500 text-white hover:bg-green-600',
    calendarClass: 'bg-green-400 hover:bg-green-500',
    colorHex: '#22c55e',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 2,
  },
  
  // pending + pending = Sin pago (amarillo)
  pending: {
    label: 'Sin Pago (2h)',
    description: 'Reserva sin pago, expira en 2 horas',
    badgeClass: 'bg-yellow-400 text-black hover:bg-yellow-500',
    calendarClass: 'bg-yellow-400 hover:bg-yellow-500',
    colorHex: '#facc15',
    isActive: true,
    includeInRevenue: false,
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 3,
  },
  
  // ============================================
  // ESTADOS FINALIZADOS - No ocupan vehículo
  // ============================================
  
  completed: {
    label: 'Completada',
    description: 'Reserva finalizada, vehículo devuelto',
    badgeClass: 'bg-slate-500 text-white',
    calendarClass: 'bg-slate-300',
    colorHex: '#64748b',
    isActive: false,
    includeInRevenue: true,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 10,
  },
  
  expired: {
    label: 'Expirada',
    description: 'Expiró por falta de pago después de 2 horas',
    badgeClass: 'bg-orange-400 text-white',
    calendarClass: 'bg-orange-200',
    colorHex: '#fb923c',
    isActive: false,
    includeInRevenue: false,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 11,
  },
  
  cancelled: {
    label: 'Cancelada',
    description: 'Reserva cancelada',
    badgeClass: 'bg-red-700 text-white',
    calendarClass: 'bg-red-200',
    colorHex: '#b91c1c',
    isActive: false,
    includeInRevenue: false,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 12,
  },
};

// Mapeo de estados legacy (por si hay datos antiguos)
const LEGACY_STATE_MAP: Record<string, string> = {
  'sin_pago': 'pending',
  'con_pago': 'pending_paid',
  'confirmado': 'confirmed',
  'completada': 'completed',
  'cancelada': 'cancelled',
  'expirada': 'expired',
  'contrato_generado': 'confirmed',
  'pending_no_payment': 'pending',
  'pending_with_payment': 'pending_paid',
  'reservado_sin_pago': 'pending',
  'reservado_con_pago': 'pending_paid',
};

/**
 * Obtiene la clave de estado efectiva considerando estado + payment_status
 */
function getEffectiveStateKey(estado: string, paymentStatus?: string): string {
  const normalizedEstado = (estado || 'pending').toLowerCase().trim();
  
  // Si es un estado legacy, mapearlo
  if (normalizedEstado in LEGACY_STATE_MAP) {
    return LEGACY_STATE_MAP[normalizedEstado];
  }
  
  // Si es pending, verificar payment_status
  if (normalizedEstado === 'pending') {
    if (paymentStatus === 'paid') {
      return 'pending_paid';
    }
    return 'pending';
  }
  
  // Si el estado existe directamente
  if (normalizedEstado in RESERVATION_STATES) {
    return normalizedEstado;
  }
  
  console.warn(`[States] Estado desconocido: "${estado}", usando pending`);
  return 'pending';
}

/**
 * Obtiene la configuración de un estado de reserva
 */
export function getStateConfig(estado: string | null | undefined, paymentStatus?: string): StateConfig {
  const key = getEffectiveStateKey(estado || 'pending', paymentStatus);
  return RESERVATION_STATES[key] || RESERVATION_STATES.pending;
}

/**
 * Normaliza un estado al formato de BD
 */
export function normalizeState(estado: string | null | undefined): string {
  if (!estado) return 'pending';
  
  const normalizedState = estado.toLowerCase().trim();
  
  // Si ya es un estado de BD válido
  if (['pending', 'confirmed', 'completed', 'cancelled', 'expired'].includes(normalizedState)) {
    return normalizedState;
  }
  
  // Mapear estados legacy
  if (normalizedState in LEGACY_STATE_MAP) {
    const mapped = LEGACY_STATE_MAP[normalizedState];
    // pending_paid no es un estado real de BD, devolver 'pending'
    if (mapped === 'pending_paid') return 'pending';
    return mapped;
  }
  
  return 'pending';
}

/**
 * Determina si una reserva está activa
 */
export function isReservationActive(estado: string, paymentStatus?: string): boolean {
  return getStateConfig(estado, paymentStatus).isActive;
}

/**
 * Determina si debe incluirse en ingresos financieros
 */
export function shouldIncludeInRevenue(estado: string, paymentStatus?: string): boolean {
  const config = getStateConfig(estado, paymentStatus);
  return config.includeInRevenue;
}

/**
 * Determina si ocupa el vehículo en el calendario
 */
export function occupiesVehicleInCalendar(estado: string, paymentStatus?: string): boolean {
  return getStateConfig(estado, paymentStatus).occupiesVehicle;
}

/**
 * Tipo de estado para el calendario
 */
export type CalendarStatus = 'rented' | 'paid' | 'no_payment' | 'maintenance' | 'available';

export function getCalendarStatus(estado: string, paymentStatus?: string): CalendarStatus {
  const key = getEffectiveStateKey(estado, paymentStatus);
  
  // Estados que no ocupan vehículo
  if (['completed', 'expired', 'cancelled'].includes(key)) {
    return 'available';
  }
  
  switch (key) {
    case 'confirmed':
      return 'rented';
    case 'pending_paid':
      return 'paid';
    case 'pending':
    default:
      return 'no_payment';
  }
}

/**
 * Estados activos para queries de BD
 */
export const ACTIVE_STATES_FOR_QUERY = ['pending', 'confirmed'];

/**
 * Estados que generan ingresos para queries
 */
export const REVENUE_STATES_FOR_QUERY = ['confirmed', 'completed'];

/**
 * Tiempo de auto-cancelación (2 horas)
 */
export const AUTO_CANCEL_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Verifica si una reserva debería haber expirado
 */
export function shouldBeExpired(reservation: {
  estado: string;
  payment_status?: string;
  auto_cancel_at?: string | null;
  created_at: string;
}): boolean {
  const config = getStateConfig(reservation.estado, reservation.payment_status);
  
  if (!config.hasAutoCancelTimer) {
    return false;
  }
  
  const now = new Date();
  let expirationTime: Date;
  
  if (reservation.auto_cancel_at) {
    expirationTime = new Date(reservation.auto_cancel_at);
  } else {
    expirationTime = new Date(new Date(reservation.created_at).getTime() + AUTO_CANCEL_TIME_MS);
  }
  
  return now > expirationTime;
}

/**
 * Calcula el tiempo restante antes de expiración
 */
export function getTimeUntilExpiration(reservation: {
  estado: string;
  payment_status?: string;
  auto_cancel_at?: string | null;
  created_at: string;
}): { hours: number; minutes: number; isExpired: boolean; isUrgent: boolean } | null {
  const config = getStateConfig(reservation.estado, reservation.payment_status);
  
  if (!config.hasAutoCancelTimer) {
    return null;
  }
  
  const now = new Date();
  let expirationTime: Date;
  
  if (reservation.auto_cancel_at) {
    expirationTime = new Date(reservation.auto_cancel_at);
  } else {
    expirationTime = new Date(new Date(reservation.created_at).getTime() + AUTO_CANCEL_TIME_MS);
  }
  
  const diff = expirationTime.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, isExpired: true, isUrgent: true };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = diff < 30 * 60 * 1000;
  
  return { hours, minutes, isExpired: false, isUrgent };
}

// Colores del calendario
export const CALENDAR_COLORS = {
  rented: 'bg-red-500 hover:bg-red-600',
  paid: 'bg-green-400 hover:bg-green-500',
  no_payment: 'bg-yellow-400 hover:bg-yellow-500',
  maintenance: 'bg-orange-500 hover:bg-orange-600',
  available: 'bg-white border border-border hover:bg-muted/20',
};
