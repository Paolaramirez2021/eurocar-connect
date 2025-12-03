/**
 * Utility functions for Bogotá Pico y Placa restrictions
 * 
 * Reglas actuales:
 * - Lunes a viernes, 6:00 AM - 9:00 PM
 * - NO aplica en festivos colombianos
 * - Días PARES del mes: pueden circular placas terminadas en 0, 2, 4, 6, 8
 * - Días IMPARES del mes: pueden circular placas terminadas en 1, 3, 5, 7, 9
 */

import { isColombianHoliday } from './colombianHolidays';

/**
 * Get the last digit of a license plate
 */
export const getLastDigit = (placa: string): number | null => {
  const cleaned = placa.replace(/[^0-9]/g, '');
  if (cleaned.length === 0) return null;
  return parseInt(cleaned[cleaned.length - 1]);
};

/**
 * Check if a date is a restricted day for a given plate
 * Based on even/odd day of month and last digit of plate
 * Does NOT apply on Colombian holidays
 */
export const isPicoPlacaDay = (date: Date, placa: string): boolean => {
  const dayOfWeek = date.getDay();
  // Only Monday to Friday (1-5)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // Check if it's a Colombian holiday - NO pico y placa on holidays
  if (isColombianHoliday(date)) return false;
  
  const lastDigit = getLastDigit(placa);
  if (lastDigit === null) return false;
  
  const dayOfMonth = date.getDate();
  const isEvenDay = dayOfMonth % 2 === 0;
  const isEvenPlate = lastDigit % 2 === 0;
  
  // Pico y placa applies when:
  // - Even day of month AND odd plate number, OR
  // - Odd day of month AND even plate number
  return isEvenDay ? !isEvenPlate : isEvenPlate;
};

/**
 * Get pico y placa info for a plate
 */
export const getPicoPlacaInfo = (placa: string): string => {
  const lastDigit = getLastDigit(placa);
  if (lastDigit === null) return 'No aplica';
  
  const isEven = lastDigit % 2 === 0;
  
  if (isEven) {
    return `Dígito ${lastDigit} (PAR): Restricción en días IMPARES del mes`;
  } else {
    return `Dígito ${lastDigit} (IMPAR): Restricción en días PARES del mes`;
  }
};

/**
 * Get the restriction time window
 */
export const getPicoPlacaHours = (): string => {
  return 'Lunes a Viernes (excepto festivos): 6:00 AM - 9:00 PM';
};

/**
 * Check if current time is within pico y placa hours
 */
export const isWithinPicoPlacaHours = (date: Date = new Date()): boolean => {
  const hours = date.getHours();
  return hours >= 6 && hours < 21; // 6 AM to 9 PM
};
