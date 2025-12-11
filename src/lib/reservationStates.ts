/**
 * CONFIGURACIÓN CENTRALIZADA DE ESTADOS DE RESERVAS
 * Única fuente de verdad para estados, colores y comportamientos
 */

export const RESERVATION_STATES = {
  // Pagada y con contrato (RENTADO)
  CONFIRMED: 'confirmed',
  
  // Pagada sin contrato
  PAID_NO_CONTRACT: 'pending_with_payment',
  
  // Reservada sin pago (2 horas)
  PENDING_NO_PAYMENT: 'pending_no_payment',
  PENDING: 'pending',
  
  // Expirada (sin pago después de 2h)
  EXPIRED: 'expired',
  
  // Cancelaciones
  CANCELLED_WITH_REFUND: 'cancelled_with_refund',
  CANCELLED_NO_REFUND: 'cancelled_no_refund',
  CANCELLED: 'cancelled', // Genérico
  
  // Completada
  COMPLETED: 'completed',
} as const;

export type ReservationState = typeof RESERVATION_STATES[keyof typeof RESERVATION_STATES];

/**
 * COLORES POR ESTADO
 * Consistentes en toda la aplicación
 */
export const STATE_COLORS = {
  [RESERVATION_STATES.CONFIRMED]: {
    badge: 'bg-red-500 text-white',
    calendar: '#ef4444', // Rojo
    label: 'Confirmada (Rentado)',
    description: 'Pagada con contrato firmado',
  },
  [RESERVATION_STATES.PAID_NO_CONTRACT]: {
    badge: 'bg-green-600 text-white',
    calendar: '#16a34a', // Verde oscuro
    label: 'Pagada (Sin Contrato)',
    description: 'Pagada pero falta contrato',
  },
  [RESERVATION_STATES.PENDING_NO_PAYMENT]: {
    badge: 'bg-lime-400 text-black',
    calendar: '#a3e635', // Verde claro/Lima
    label: 'Reservado sin Pago (2h)',
    description: 'Tiene 2 horas para pagar',
  },
  [RESERVATION_STATES.PENDING]: {
    badge: 'bg-lime-400 text-black',
    calendar: '#a3e635',
    label: 'Reservado sin Pago (2h)',
    description: 'Tiene 2 horas para pagar',
  },
  [RESERVATION_STATES.EXPIRED]: {
    badge: 'bg-gray-400 text-white line-through',
    calendar: '#9ca3af', // Gris
    label: 'Expirada',
    description: 'No se pagó en 2 horas',
  },
  [RESERVATION_STATES.CANCELLED_WITH_REFUND]: {
    badge: 'bg-gray-500 text-white',
    calendar: '#6b7280',
    label: 'Cancelada (Con Devolución)',
    description: 'Cancelada con reembolso',
  },
  [RESERVATION_STATES.CANCELLED_NO_REFUND]: {
    badge: 'bg-orange-500 text-white',
    calendar: '#f97316',
    label: 'Cancelada (Sin Devolución)',
    description: 'Cancelada con penalidad',
  },
  [RESERVATION_STATES.CANCELLED]: {
    badge: 'bg-gray-500 text-white',
    calendar: '#6b7280',
    label: 'Cancelada',
    description: 'Cancelada',
  },
  [RESERVATION_STATES.COMPLETED]: {
    badge: 'bg-gray-300 text-gray-700',
    calendar: '#d1d5db',
    label: 'Completada',
    description: 'Terminada',
  },
} as const;

/**
 * LÓGICA DE NEGOCIO POR ESTADO
 */
export const STATE_BEHAVIOR = {
  // Estados que ocupan el calendario
  occupiesCalendar: [
    RESERVATION_STATES.CONFIRMED,
    RESERVATION_STATES.PAID_NO_CONTRACT,
    RESERVATION_STATES.PENDING_NO_PAYMENT,
    RESERVATION_STATES.PENDING,
  ],
  
  // Estados que cuentan en finanzas
  countsInFinances: [
    RESERVATION_STATES.CONFIRMED,
    RESERVATION_STATES.PAID_NO_CONTRACT,
    RESERVATION_STATES.COMPLETED,
    RESERVATION_STATES.CANCELLED_NO_REFUND, // Se queda el dinero
  ],
  
  // Estados que NO cuentan en finanzas
  excludeFromFinances: [
    RESERVATION_STATES.EXPIRED,
    RESERVATION_STATES.PENDING_NO_PAYMENT,
    RESERVATION_STATES.PENDING,
    RESERVATION_STATES.CANCELLED_WITH_REFUND,
  ],
  
  // Estados que se pueden cancelar
  cancellable: [
    RESERVATION_STATES.PENDING_NO_PAYMENT,
    RESERVATION_STATES.PENDING,
    RESERVATION_STATES.PAID_NO_CONTRACT,
  ],
  
  // Estados finales (no cambian más)
  final: [
    RESERVATION_STATES.EXPIRED,
    RESERVATION_STATES.CANCELLED_WITH_REFUND,
    RESERVATION_STATES.CANCELLED_NO_REFUND,
    RESERVATION_STATES.CANCELLED,
    RESERVATION_STATES.COMPLETED,
  ],
} as const;

/**
 * Obtener configuración de color para un estado
 */
export function getStateConfig(estado: string) {
  return STATE_COLORS[estado as ReservationState] || STATE_COLORS[RESERVATION_STATES.PENDING];
}

/**
 * Verificar si una reserva ocupa el calendario
 */
export function occupiesCalendar(estado: string): boolean {
  return STATE_BEHAVIOR.occupiesCalendar.includes(estado as ReservationState);
}

/**
 * Verificar si una reserva cuenta en finanzas
 */
export function countsInFinances(estado: string): boolean {
  return STATE_BEHAVIOR.countsInFinances.includes(estado as ReservationState);
}

/**
 * Verificar si una reserva se puede cancelar
 */
export function isCancellable(estado: string): boolean {
  return STATE_BEHAVIOR.cancellable.includes(estado as ReservationState);
}

/**
 * Verificar si una reserva está expirada
 */
export function isExpired(estado: string): boolean {
  return estado === RESERVATION_STATES.EXPIRED;
}

/**
 * Verificar si una reserva necesita expiración automática
 */
export function needsExpirationCheck(estado: string, createdAt: string): boolean {
  if (estado !== RESERVATION_STATES.PENDING_NO_PAYMENT && estado !== RESERVATION_STATES.PENDING) {
    return false;
  }
  
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  
  return (now - createdTime) > twoHoursInMs;
}
