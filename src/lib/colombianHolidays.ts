/**
 * Colombian Holidays Library
 * Handles all Colombian national holidays including fixed and movable dates (Ley Emiliani)
 */

/**
 * Calculate Easter Sunday for a given year using Computus algorithm
 */
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

/**
 * Move a date to the next Monday (Ley Emiliani)
 */
const moveToNextMonday = (date: Date): Date => {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  
  // If it's not Monday (1), move to next Monday
  if (dayOfWeek !== 1) {
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    result.setDate(result.getDate() + daysUntilMonday);
  }
  
  return result;
};

/**
 * Get all Colombian holidays for a specific year
 */
export const getColombianHolidays = (year: number): Date[] => {
  const holidays: Date[] = [];
  
  // Fixed holidays (never move)
  holidays.push(new Date(year, 0, 1));    // Año Nuevo
  holidays.push(new Date(year, 4, 1));    // Día del Trabajo
  holidays.push(new Date(year, 6, 20));   // Día de la Independencia
  holidays.push(new Date(year, 7, 7));    // Batalla de Boyacá
  holidays.push(new Date(year, 11, 8));   // Inmaculada Concepción
  holidays.push(new Date(year, 11, 25));  // Navidad
  
  // Holidays that move to next Monday (Ley Emiliani)
  holidays.push(moveToNextMonday(new Date(year, 0, 6)));   // Reyes Magos
  holidays.push(moveToNextMonday(new Date(year, 2, 19)));  // San José
  holidays.push(moveToNextMonday(new Date(year, 5, 29)));  // San Pedro y San Pablo
  holidays.push(moveToNextMonday(new Date(year, 7, 15)));  // Asunción de la Virgen
  holidays.push(moveToNextMonday(new Date(year, 9, 12)));  // Día de la Raza
  holidays.push(moveToNextMonday(new Date(year, 10, 1)));  // Todos los Santos
  holidays.push(moveToNextMonday(new Date(year, 10, 11))); // Independencia de Cartagena
  
  // Easter-based holidays
  const easter = getEasterSunday(year);
  
  // Jueves Santo (3 days before Easter)
  const jueveSanto = new Date(easter);
  jueveSanto.setDate(easter.getDate() - 3);
  holidays.push(jueveSanto);
  
  // Viernes Santo (2 days before Easter)
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  holidays.push(viernesSanto);
  
  // Ascensión del Señor (43 days after Easter, moved to next Monday)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 43);
  holidays.push(moveToNextMonday(ascension));
  
  // Corpus Christi (64 days after Easter, moved to next Monday)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 64);
  holidays.push(moveToNextMonday(corpusChristi));
  
  // Sagrado Corazón (71 days after Easter, moved to next Monday)
  const sagradoCorazon = new Date(easter);
  sagradoCorazon.setDate(easter.getDate() + 71);
  holidays.push(moveToNextMonday(sagradoCorazon));
  
  return holidays;
};

/**
 * Check if a specific date is a Colombian holiday
 */
export const isColombianHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getColombianHolidays(year);
  
  const dateString = date.toISOString().split('T')[0];
  
  return holidays.some(holiday => {
    const holidayString = holiday.toISOString().split('T')[0];
    return holidayString === dateString;
  });
};

/**
 * Get the name of the holiday if the date is a Colombian holiday
 */
export const getHolidayName = (date: Date): string | null => {
  if (!isColombianHoliday(date)) return null;
  
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Fixed holidays
  if (month === 0 && day === 1) return 'Año Nuevo';
  if (month === 4 && day === 1) return 'Día del Trabajo';
  if (month === 6 && day === 20) return 'Día de la Independencia';
  if (month === 7 && day === 7) return 'Batalla de Boyacá';
  if (month === 11 && day === 8) return 'Inmaculada Concepción';
  if (month === 11 && day === 25) return 'Navidad';
  
  // Check movable holidays
  const easter = getEasterSunday(year);
  const dateString = date.toISOString().split('T')[0];
  
  const jueveSanto = new Date(easter);
  jueveSanto.setDate(easter.getDate() - 3);
  if (dateString === jueveSanto.toISOString().split('T')[0]) return 'Jueves Santo';
  
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  if (dateString === viernesSanto.toISOString().split('T')[0]) return 'Viernes Santo';
  
  // For Ley Emiliani holidays, check if it's a Monday and matches
  if (date.getDay() === 1) {
    if (month === 0) return 'Día de los Reyes Magos';
    if (month === 2) return 'Día de San José';
    if (month === 5) return 'San Pedro y San Pablo';
    if (month === 7) return 'Asunción de la Virgen';
    if (month === 9) return 'Día de la Raza';
    if (month === 10 && day <= 7) return 'Todos los Santos';
    if (month === 10 && day > 7) return 'Independencia de Cartagena';
    
    // Easter-based Mondays
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 43);
    if (dateString === moveToNextMonday(ascension).toISOString().split('T')[0]) {
      return 'Ascensión del Señor';
    }
    
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 64);
    if (dateString === moveToNextMonday(corpusChristi).toISOString().split('T')[0]) {
      return 'Corpus Christi';
    }
    
    const sagradoCorazon = new Date(easter);
    sagradoCorazon.setDate(easter.getDate() + 71);
    if (dateString === moveToNextMonday(sagradoCorazon).toISOString().split('T')[0]) {
      return 'Sagrado Corazón de Jesús';
    }
  }
  
  return 'Festivo';
};
