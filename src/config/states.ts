/**
 * Configuración centralizada de estados de reservas - UNIFICADO v2
 * 
 * IMPORTANTE: El campo `estado` es la ÚNICA fuente de verdad para determinar
 * el color, comportamiento y visibilidad de una reserva.
 * 
 * Estados oficiales:
 * - pendiente: Reserva creada (estado inicial)
 * - sin_pago: Reserva sin pago (2h para pagar antes de expirar)
 * - con_pago: Reserva pagada, lista para contrato
 * - contrato_generado: Contrato creado, pendiente firma
 * - confirmado: Contrato firmado, vehículo entregado
 * - completada: Vehículo devuelto
 * - cancelada: Cancelada (ver cancellation_type para saber si con/sin devolución)
 * - expirada: Expiró por falta de pago
 */

export type ReservationStatus = 
  | 'pendiente'            // Estado inicial
  | 'sin_pago'             // Reserva sin pago (2h para pagar)
  | 'con_pago'             // Pagado, sin contrato
  | 'contrato_generado'    // Contrato creado, pendiente firma
  | 'confirmado'           // Contrato firmado, vehículo entregado
  | 'completada'           // Vehículo devuelto
  | 'cancelada'            // Cancelada
  | 'expirada';            // Expiró por falta de pago

export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type CancellationType = 'con_devolucion' | 'sin_devolucion' | null;

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
 * Configuración de todos los estados de reservas
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
  
  contrato_generado: {
    label: 'Contrato Generado',
    description: 'Contrato creado, pendiente de firma',
    badgeClass: 'bg-blue-500 text-white hover:bg-blue-600',
    calendarClass: 'bg-blue-400 hover:bg-blue-500',
    colorHex: '#3b82f6',
    isActive: true,
    includeInRevenue: true,
    occupiesVehicle: true,
    hasAutoCancelTimer: false,
    sortPriority: 2,
  },
  
  con_pago: {
    label: 'Con Pago',
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
  
  sin_pago: {
    label: 'Sin Pago (2h)',
    description: 'Reserva sin pago, expira en 2 horas',
    badgeClass: 'bg-yellow-400 text-black hover:bg-yellow-500',
    calendarClass: 'bg-yellow-400 hover:bg-yellow-500',
    colorHex: '#facc15',
    isActive: true,
    includeInRevenue: false,
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 4,
  },
  
  pendiente: {
    label: 'Pendiente',
    description: 'Reserva recién creada',
    badgeClass: 'bg-gray-400 text-white hover:bg-gray-500',
    calendarClass: 'bg-gray-300 hover:bg-gray-400',
    colorHex: '#9ca3af',
    isActive: true,
    includeInRevenue: false,
    occupiesVehicle: true,
    hasAutoCancelTimer: true,
    sortPriority: 5,
  },
  
  // ============================================
  // ESTADOS FINALIZADOS - No ocupan vehículo
  // ============================================
  
  completada: {
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
  
  expirada: {
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
  
  cancelada: {
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

// Mapeo de estados legacy a nuevos estados
const LEGACY_STATE_MAP: Record<string, ReservationStatus> = {
  // Legacy -> Nuevo
  'pending': 'sin_pago',
  'pending_no_payment': 'sin_pago',
  'pending_with_payment': 'con_pago',
  'reservado_sin_pago': 'sin_pago',
  'reservado_con_pago': 'con_pago',
  'reserved_paid': 'con_pago',
  'reserved_no_payment': 'sin_pago',
  'reserved': 'sin_pago',
  'confirmed': 'confirmado',
  'active': 'confirmado',
  'rented': 'confirmado',
  'completed': 'completada',
  'cancelled': 'cancelada',
  'cancelada_con_devolucion': 'cancelada',
  'cancelada_sin_devolucion': 'cancelada',
  'expired': 'expirada',
  'pendiente_contrato': 'contrato_generado',
};

/**
 * Obtiene la configuración de un estado de reserva
 */
export function getStateConfig(estado: string | null | undefined): StateConfig {
  if (!estado) {
    return RESERVATION_STATES.sin_pago;
  }
  
  const normalizedState = estado.toLowerCase().trim();
  
  // Si es un estado nuevo válido
  if (normalizedState in RESERVATION_STATES) {
    return RESERVATION_STATES[normalizedState as ReservationStatus];
  }
  
  // Si es un estado legacy, mapearlo
  if (normalizedState in LEGACY_STATE_MAP) {
    const newState = LEGACY_STATE_MAP[normalizedState];
    return RESERVATION_STATES[newState];
  }
  
  console.warn(`[States] Estado desconocido: "${estado}", usando sin_pago`);
  return RESERVATION_STATES.sin_pago;
}

/**
 * Normaliza un estado legacy al nuevo formato
 */
export function normalizeState(estado: string | null | undefined): ReservationStatus {
  if (!estado) return 'sin_pago';
  
  const normalizedState = estado.toLowerCase().trim();
  
  if (normalizedState in RESERVATION_STATES) {
    return normalizedState as ReservationStatus;
  }
  
  if (normalizedState in LEGACY_STATE_MAP) {
    return LEGACY_STATE_MAP[normalizedState];
  }
  
  return 'sin_pago';
}

/**
 * Determina si una reserva está activa
 */
export function isReservationActive(estado: string): boolean {
  return getStateConfig(estado).isActive;
}

/**
 * Determina si debe incluirse en ingresos financieros
 * Más permisivo: incluye si tiene pago confirmado O estado que genera ingreso
 */
export function shouldIncludeInRevenue(estado: string, cancellationType?: CancellationType): boolean {
  const normalized = normalizeState(estado);
  
  // Estados que SIEMPRE generan ingreso
  const revenueStates = ['con_pago', 'contrato_generado', 'confirmado', 'completada'];
  if (revenueStates.includes(normalized)) {
    return true;
  }
  
  // Cancelada sin devolución SÍ cuenta como ingreso
  if (normalized === 'cancelada' && cancellationType === 'sin_devolucion') {
    return true;
  }
  
  // Por defecto, no genera ingreso
  return false;
}

/**
 * Determina si ocupa el vehículo en el calendario
 */
export function occupiesVehicleInCalendar(estado: string): boolean {
  return getStateConfig(estado).occupiesVehicle;
}

/**
 * Tipo de estado para el calendario
 */
export type CalendarStatus = 'rented' | 'contract_pending' | 'paid' | 'no_payment' | 'maintenance' | 'available';

export function getCalendarStatus(estado: string): CalendarStatus {
  const config = getStateConfig(estado);
  
  if (!config.occupiesVehicle) {
    return 'available';
  }
  
  const normalized = normalizeState(estado);
  
  switch (normalized) {
    case 'confirmado':
      return 'rented';
    case 'contrato_generado':
      return 'contract_pending';
    case 'con_pago':
      return 'paid';
    case 'sin_pago':
    case 'pendiente':
    default:
      return 'no_payment';
  }
}

/**
 * Estados que ocupan vehículo en calendario
 */
export const CALENDAR_VISIBLE_STATES: ReservationStatus[] = [
  'confirmado',
  'contrato_generado',
  'con_pago',
  'sin_pago',
  'pendiente',
];

/**
 * Estados que generan ingresos
 */
export const REVENUE_STATES: ReservationStatus[] = [
  'con_pago',
  'contrato_generado',
  'confirmado',
  'completada',
];

/**
 * Estados inactivos
 */
export const INACTIVE_STATES: ReservationStatus[] = [
  'expirada',
  'cancelada',
  'completada',
];

/**
 * Tiempo de auto-cancelación (2 horas)
 */
export const AUTO_CANCEL_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Verifica si una reserva debería haber expirado
 */
export function shouldBeExpired(reservation: {
  estado: string;
  auto_cancel_at?: string | null;
  created_at: string;
}): boolean {
  const config = getStateConfig(reservation.estado);
  
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

// Colores del calendario
export const CALENDAR_COLORS = {
  rented: 'bg-red-500 hover:bg-red-600',              // confirmado
  contract_pending: 'bg-blue-400 hover:bg-blue-500',   // contrato_generado
  paid: 'bg-green-400 hover:bg-green-500',             // con_pago
  no_payment: 'bg-yellow-400 hover:bg-yellow-500',     // sin_pago
  maintenance: 'bg-orange-500 hover:bg-orange-600',
  available: 'bg-white border border-border hover:bg-muted/20',
};

/**
 * Etiqueta de cancelación basada en tipo
 */
export function getCancellationLabel(cancellationType: CancellationType): string {
  if (cancellationType === 'con_devolucion') {
    return 'Cancelada (con devolución)';
  }
  if (cancellationType === 'sin_devolucion') {
    return 'Cancelada (sin devolución)';
  }
  return 'Cancelada';
}

/**
 * Todos los estados para queries de base de datos
 * Incluye legacy para compatibilidad
 */
export const ALL_ACTIVE_STATES_FOR_QUERY = [
  // Nuevos
  'sin_pago', 'con_pago', 'contrato_generado', 'confirmado', 'pendiente',
  // Legacy
  'pending', 'pending_no_payment', 'pending_with_payment', 'confirmed', 'reservado_sin_pago', 'reservado_con_pago'
];

export const ALL_REVENUE_STATES_FOR_QUERY = [
  // Nuevos
  'con_pago', 'contrato_generado', 'confirmado', 'completada',
  // Legacy
  'pending_with_payment', 'confirmed', 'completed', 'reservado_con_pago'
];
