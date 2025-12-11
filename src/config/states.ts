/**
 * Configuración centralizada de estados de reservas - UNIFICADO
 * 
 * IMPORTANTE: El campo `estado` es la ÚNICA fuente de verdad para determinar
 * el color, comportamiento y visibilidad de una reserva.
 * 
 * El campo `payment_status` solo se usa para tracking interno de pagos.
 */

export type ReservationStatus = 
  | 'reservado_sin_pago'    // Reserva nueva sin pago (2h para pagar)
  | 'reservado_con_pago'    // Pagado, sin contrato
  | 'pendiente_contrato'    // Contrato generado, pendiente firma
  | 'confirmado'            // Contrato firmado, vehículo entregado
  | 'completada'            // Vehículo devuelto, reserva finalizada
  | 'expirada'              // Expiró por falta de pago (2h)
  | 'cancelada';            // Cancelada (ver payment_status para saber si hubo devolución)

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface StateConfig {
  /** Etiqueta para mostrar en badges */
  label: string;
  /** Descripción corta del estado */
  description: string;
  /** Clase CSS para el badge (Tailwind) */
  badgeClass: string;
  /** Color para calendario (Tailwind background) */
  calendarClass: string;
  /** Color hex para uso en otros contextos */
  colorHex: string;
  /** Si la reserva está activa (ocupa vehículo) */
  isActive: boolean;
  /** Si debe incluirse en reportes financieros de ingresos */
  includeInRevenue: boolean;
  /** Si el vehículo está ocupado en el calendario */
  occupiesVehicle: boolean;
  /** Si tiene auto-cancelación pendiente */
  hasAutoCancelTimer: boolean;
  /** Orden de prioridad para listas (menor = más importante) */
  sortPriority: number;
}

/**
 * Configuración de todos los estados de reservas - UNIFICADO
 */
export const RESERVATION_STATES: Record<ReservationStatus, StateConfig> = {
  // ============================================
  // ESTADOS ACTIVOS - Ocupan vehículo
  // ============================================
  
  confirmado: {
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
  
  pendiente_contrato: {
    label: 'Pendiente de Contrato',
    description: 'Contrato generado, esperando firma',
    badgeClass: 'bg-blue-500 text-white hover:bg-blue-600',
    calendarClass: 'bg-blue-400 hover:bg-blue-500',
    colorHex: '#3b82f6',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 2,
  },
  
  reservado_con_pago: {
    label: 'Reservado con Pago',
    description: 'Reserva pagada, pendiente de contrato',
    badgeClass: 'bg-green-500 text-white hover:bg-green-600',
    calendarClass: 'bg-green-400 hover:bg-green-500',
    colorHex: '#22c55e',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 3,
  },
  
  reservado_sin_pago: {
    label: 'Reservado sin Pago (2h)',
    description: 'Reserva sin pago, expira en 2 horas',
    badgeClass: 'bg-lime-400 text-black hover:bg-lime-500',
    calendarClass: 'bg-lime-400 hover:bg-lime-500',
    colorHex: '#a3e635',
    isActive: true,
    includeInRevenue: false, // No contar hasta que se pague
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 4,
  },
  
  // ============================================
  // ESTADOS FINALIZADOS - No ocupan vehículo
  // ============================================
  
  completada: {
    label: 'Completada',
    description: 'Reserva finalizada, vehículo devuelto',
    badgeClass: 'bg-gray-500 text-white',
    calendarClass: 'bg-gray-300',
    colorHex: '#6b7280',
    isActive: false,
    includeInRevenue: true,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 10,
  },
  
  expirada: {
    label: 'Expirada',
    description: 'Expiró por falta de pago después de 2 horas',
    badgeClass: 'bg-gray-400 text-white',
    calendarClass: 'bg-gray-200',
    colorHex: '#9ca3af',
    isActive: false,
    includeInRevenue: false,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 11,
  },
  
  cancelada: {
    label: 'Cancelada',
    description: 'Reserva cancelada',
    badgeClass: 'bg-red-700 text-white',
    calendarClass: 'bg-red-200',
    colorHex: '#b91c1c',
    isActive: false,
    includeInRevenue: false, // Ver payment_status para saber si fue con devolución
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 12,
  },
};

// Mapeo de estados legacy a nuevos estados
const LEGACY_STATE_MAP: Record<string, ReservationStatus> = {
  // Estados legacy -> nuevo estado
  'pending': 'reservado_sin_pago',
  'pending_no_payment': 'reservado_sin_pago',
  'pending_with_payment': 'reservado_con_pago',
  'reserved_paid': 'reservado_con_pago',
  'reserved_no_payment': 'reservado_sin_pago',
  'reserved': 'reservado_sin_pago',
  'confirmed': 'confirmado',
  'active': 'confirmado',
  'rented': 'confirmado',
  'completed': 'completada',
  'cancelled': 'cancelada',
  'cancelada_con_devolucion': 'cancelada',
  'cancelada_sin_devolucion': 'cancelada',
  'expired': 'expirada',
};

/**
 * Obtiene la configuración de un estado de reserva
 * Maneja estados legacy y desconocidos
 */
export function getStateConfig(estado: string | null | undefined): StateConfig {
  if (!estado) {
    return RESERVATION_STATES.reservado_sin_pago;
  }
  
  const normalizedState = estado.toLowerCase().trim();
  
  // Si es un estado nuevo válido, devolverlo directamente
  if (normalizedState in RESERVATION_STATES) {
    return RESERVATION_STATES[normalizedState as ReservationStatus];
  }
  
  // Si es un estado legacy, mapearlo al nuevo
  if (normalizedState in LEGACY_STATE_MAP) {
    const newState = LEGACY_STATE_MAP[normalizedState];
    return RESERVATION_STATES[newState];
  }
  
  // Estado desconocido, devolver default
  console.warn(`[States] Estado desconocido: "${estado}", usando reservado_sin_pago`);
  return RESERVATION_STATES.reservado_sin_pago;
}

/**
 * Normaliza un estado legacy al nuevo formato
 */
export function normalizeState(estado: string | null | undefined): ReservationStatus {
  if (!estado) return 'reservado_sin_pago';
  
  const normalizedState = estado.toLowerCase().trim();
  
  // Si ya es un estado nuevo válido
  if (normalizedState in RESERVATION_STATES) {
    return normalizedState as ReservationStatus;
  }
  
  // Si es legacy, mapear
  if (normalizedState in LEGACY_STATE_MAP) {
    return LEGACY_STATE_MAP[normalizedState];
  }
  
  return 'reservado_sin_pago';
}

/**
 * Determina si una reserva está activa basándose SOLO en su estado
 */
export function isReservationActive(estado: string): boolean {
  return getStateConfig(estado).isActive;
}

/**
 * Determina si una reserva debe incluirse en los ingresos financieros
 * Solo cuenta: reservado_con_pago, pendiente_contrato, confirmado, completada
 */
export function shouldIncludeInRevenue(estado: string): boolean {
  const config = getStateConfig(estado);
  return config.includeInRevenue;
}

/**
 * Determina si una reserva ocupa el vehículo en el calendario
 */
export function occupiesVehicleInCalendar(estado: string): boolean {
  return getStateConfig(estado).occupiesVehicle;
}

/**
 * Obtiene el tipo de estado para el calendario
 */
export type CalendarStatus = 'rented' | 'pending_contract' | 'reserved_paid' | 'reserved_no_payment' | 'maintenance' | 'available';

export function getCalendarStatus(estado: string): CalendarStatus {
  const config = getStateConfig(estado);
  
  // Si no ocupa vehículo, está disponible
  if (!config.occupiesVehicle) {
    return 'available';
  }
  
  // Mapear al tipo de calendario basándose SOLO en estado
  const normalized = normalizeState(estado);
  
  switch (normalized) {
    case 'confirmado':
    case 'completada':
      return 'rented';
    case 'pendiente_contrato':
      return 'pending_contract';
    case 'reservado_con_pago':
      return 'reserved_paid';
    case 'reservado_sin_pago':
    default:
      return 'reserved_no_payment';
  }
}

/**
 * Estados que deben mostrarse en el calendario (ocupan vehículo)
 */
export const CALENDAR_VISIBLE_STATES: ReservationStatus[] = [
  'confirmado',
  'pendiente_contrato',
  'reservado_con_pago',
  'reservado_sin_pago',
];

/**
 * Estados que cuentan para reportes financieros de ingresos
 */
export const REVENUE_STATES: ReservationStatus[] = [
  'reservado_con_pago',
  'pendiente_contrato',
  'confirmado',
  'completada',
];

/**
 * Estados inactivos que no ocupan vehículo
 */
export const INACTIVE_STATES: ReservationStatus[] = [
  'expirada',
  'cancelada',
];

/**
 * Tiempo de auto-cancelación en milisegundos (2 horas)
 */
export const AUTO_CANCEL_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Verifica si una reserva debería haber expirado
 * SOLO basándose en el estado y tiempo
 */
export function shouldBeExpired(reservation: {
  estado: string;
  auto_cancel_at?: string | null;
  created_at: string;
}): boolean {
  const config = getStateConfig(reservation.estado);
  
  // Solo estados con timer de auto-cancelación pueden expirar
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
  auto_cancel_at?: string | null;
  created_at: string;
}): { hours: number; minutes: number; isExpired: boolean; isUrgent: boolean } | null {
  const config = getStateConfig(reservation.estado);
  
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

// Colores del calendario usando el sistema unificado
export const CALENDAR_COLORS = {
  rented: 'bg-red-500 hover:bg-red-600',           // confirmado
  pending_contract: 'bg-blue-400 hover:bg-blue-500', // pendiente_contrato
  reserved_paid: 'bg-green-400 hover:bg-green-500',  // reservado_con_pago
  reserved_no_payment: 'bg-lime-400 hover:bg-lime-500', // reservado_sin_pago
  maintenance: 'bg-orange-500 hover:bg-orange-600',
  available: 'bg-white border border-border hover:bg-muted/20',
};

/**
 * Obtener la etiqueta de cancelación basada en payment_status
 */
export function getCancellationLabel(paymentStatus: string | null): string {
  if (paymentStatus === 'refunded') {
    return 'Cancelada (con devolución)';
  }
  if (paymentStatus === 'paid') {
    return 'Cancelada (sin devolución)';
  }
  return 'Cancelada';
}
