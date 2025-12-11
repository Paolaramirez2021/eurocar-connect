/**
 * Configuración centralizada de estados de reservas
 * Este archivo es la ÚNICA fuente de verdad para colores, etiquetas y comportamientos
 * 
 * IMPORTANTE: Cualquier cambio en estados/colores debe hacerse aquí
 */

export type ReservationStatus = 
  | 'pending'
  | 'pending_no_payment'
  | 'pending_with_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'cancelada_con_devolucion'
  | 'cancelada_sin_devolucion'
  | 'expired';

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
 * Configuración de todos los estados de reservas
 */
export const RESERVATION_STATES: Record<ReservationStatus, StateConfig> = {
  // Estados activos - Ocupan vehículo
  confirmed: {
    label: 'Confirmada (Rentado)',
    description: 'Vehículo actualmente rentado con contrato firmado',
    badgeClass: 'bg-red-500 text-white hover:bg-red-600',
    calendarClass: 'bg-red-500 hover:bg-red-600',
    colorHex: '#ef4444',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 1,
  },
  
  pending_with_payment: {
    label: 'Reservado con Pago',
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
  
  pending_no_payment: {
    label: 'Reservado sin Pago (2h)',
    description: 'Reserva sin pago, se cancela automáticamente en 2 horas',
    badgeClass: 'bg-lime-400 text-black hover:bg-lime-500',
    calendarClass: 'bg-lime-400 hover:bg-lime-500',
    colorHex: '#a3e635',
    isActive: true,
    includeInRevenue: false, // No contar hasta que se pague
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 3,
  },
  
  // Alias para retrocompatibilidad
  pending: {
    label: 'Reservado sin Pago (2h)',
    description: 'Reserva pendiente de pago',
    badgeClass: 'bg-lime-400 text-black hover:bg-lime-500',
    calendarClass: 'bg-lime-400 hover:bg-lime-500',
    colorHex: '#a3e635',
    isActive: true,
    includeInRevenue: false,
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 3,
  },
  
  // Estados finalizados - No ocupan vehículo
  completed: {
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
    sortPriority: 11,
  },
  
  cancelada_con_devolucion: {
    label: 'Cancelada (Devolución)',
    description: 'Reserva cancelada con devolución de dinero',
    badgeClass: 'bg-orange-500 text-white',
    calendarClass: 'bg-orange-200',
    colorHex: '#f97316',
    isActive: false,
    includeInRevenue: false,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 12,
  },
  
  cancelada_sin_devolucion: {
    label: 'Cancelada (Sin Devolución)',
    description: 'Reserva cancelada sin devolución de dinero',
    badgeClass: 'bg-red-600 text-white',
    calendarClass: 'bg-red-200',
    colorHex: '#dc2626',
    isActive: false,
    includeInRevenue: true, // El dinero fue retenido
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 13,
  },
  
  expired: {
    label: 'Expirada',
    description: 'Reserva expirada por falta de pago',
    badgeClass: 'bg-gray-400 text-white',
    calendarClass: 'bg-gray-200',
    colorHex: '#9ca3af',
    isActive: false,
    includeInRevenue: false,
    occupiesVehicle: false,
    hasAutoCancelTimer: false,
    sortPriority: 14,
  },
};

/**
 * Obtiene la configuración de un estado de reserva
 * Maneja estados desconocidos devolviendo un estado por defecto
 */
export function getStateConfig(estado: string | null | undefined): StateConfig {
  if (!estado) {
    return RESERVATION_STATES.pending;
  }
  
  const normalizedState = estado.toLowerCase().trim() as ReservationStatus;
  
  // Mapeo de alias y estados legacy
  const stateMap: Record<string, ReservationStatus> = {
    'active': 'confirmed',
    'rented': 'confirmed',
    'reserved_paid': 'pending_with_payment',
    'reserved_no_payment': 'pending_no_payment',
    'reserved': 'pending_no_payment',
  };
  
  const mappedState = stateMap[normalizedState] || normalizedState;
  
  return RESERVATION_STATES[mappedState as ReservationStatus] || RESERVATION_STATES.pending;
}

/**
 * Determina si una reserva está activa basándose en su estado y pago
 */
export function isReservationActive(estado: string, paymentStatus?: string): boolean {
  const config = getStateConfig(estado);
  return config.isActive;
}

/**
 * Determina si una reserva debe incluirse en los ingresos financieros
 */
export function shouldIncludeInRevenue(estado: string, paymentStatus?: string): boolean {
  // Si el pago está confirmado, siempre incluir (excepto cancelaciones con devolución)
  if (paymentStatus === 'paid') {
    const config = getStateConfig(estado);
    // No incluir si fue cancelada con devolución
    if (estado === 'cancelada_con_devolucion' || config.colorHex === '#f97316') {
      return false;
    }
    return true;
  }
  
  return getStateConfig(estado).includeInRevenue;
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
export type CalendarStatus = 'rented' | 'reserved_paid' | 'reserved_no_payment' | 'maintenance' | 'available' | 'expired';

export function getCalendarStatus(estado: string, paymentStatus?: string): CalendarStatus {
  const config = getStateConfig(estado);
  
  // Si está expirado o cancelado, no mostrar en calendario
  if (!config.occupiesVehicle) {
    return 'available';
  }
  
  // Mapear al tipo de calendario
  if (estado === 'confirmed' || estado === 'completed' || estado === 'active') {
    return 'rented';
  }
  
  if (estado === 'pending_with_payment' || paymentStatus === 'paid') {
    return 'reserved_paid';
  }
  
  return 'reserved_no_payment';
}

/**
 * Estados que deben mostrarse en el calendario (ocupan vehículo)
 */
export const CALENDAR_VISIBLE_STATES: ReservationStatus[] = [
  'confirmed',
  'pending_with_payment',
  'pending_no_payment',
  'pending',
];

/**
 * Estados que cuentan para reportes financieros de ingresos
 */
export const REVENUE_STATES: ReservationStatus[] = [
  'confirmed',
  'pending_with_payment',
  'completed',
  'cancelada_sin_devolucion',
];

/**
 * Estados que NO deben mostrarse en reportes activos
 */
export const INACTIVE_STATES: ReservationStatus[] = [
  'cancelled',
  'cancelada_con_devolucion',
  'cancelada_sin_devolucion',
  'expired',
];

/**
 * Tiempo de auto-cancelación en milisegundos (2 horas)
 */
export const AUTO_CANCEL_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Verifica si una reserva debería haber expirado
 */
export function shouldBeExpired(reservation: {
  estado: string;
  payment_status?: string | null;
  auto_cancel_at?: string | null;
  created_at: string;
}): boolean {
  const config = getStateConfig(reservation.estado);
  
  // Solo estados con timer de auto-cancelación pueden expirar
  if (!config.hasAutoCancelTimer) {
    return false;
  }
  
  // Si ya se pagó, no puede expirar
  if (reservation.payment_status === 'paid') {
    return false;
  }
  
  const now = new Date();
  let expirationTime: Date;
  
  if (reservation.auto_cancel_at) {
    expirationTime = new Date(reservation.auto_cancel_at);
  } else {
    // Calcular desde created_at + 2 horas
    expirationTime = new Date(new Date(reservation.created_at).getTime() + AUTO_CANCEL_TIME_MS);
  }
  
  return now > expirationTime;
}

/**
 * Calcula el tiempo restante antes de expiración
 */
export function getTimeUntilExpiration(reservation: {
  estado: string;
  payment_status?: string | null;
  auto_cancel_at?: string | null;
  created_at: string;
}): { hours: number; minutes: number; isExpired: boolean; isUrgent: boolean } | null {
  const config = getStateConfig(reservation.estado);
  
  if (!config.hasAutoCancelTimer || reservation.payment_status === 'paid') {
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
  const isUrgent = diff < 30 * 60 * 1000; // Menos de 30 minutos
  
  return { hours, minutes, isExpired: false, isUrgent };
}

// Exportar colores del calendario para uso consistente
export const CALENDAR_COLORS = {
  rented: 'bg-red-500 hover:bg-red-600',
  reserved_paid: 'bg-green-400 hover:bg-green-500',
  reserved_no_payment: 'bg-lime-400 hover:bg-lime-500',
  maintenance: 'bg-orange-500 hover:bg-orange-600',
  available: 'bg-white border border-border hover:bg-muted/20',
  expired: 'bg-gray-300',
};
