import { supabase } from "@/integrations/supabase/client";

export interface GeofenceZone {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Check if coordinates are within any active geofence zone
 */
export const isWithinGeofence = async (
  latitude: number,
  longitude: number
): Promise<{ isValid: boolean; zone?: GeofenceZone; distance?: number }> => {
  try {
    const { data: zones, error } = await supabase
      .from("geofence_zones")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    if (!zones || zones.length === 0) {
      // If no zones configured, allow by default
      return { isValid: true };
    }

    for (const zone of zones) {
      const distance = calculateDistance(
        latitude,
        longitude,
        Number(zone.latitude),
        Number(zone.longitude)
      );

      if (distance <= zone.radius_meters) {
        return {
          isValid: true,
          zone: zone as GeofenceZone,
          distance: Math.round(distance),
        };
      }
    }

    // Not within any zone
    return { isValid: false };
  } catch (error) {
    console.error("Error checking geofence:", error);
    throw error;
  }
};

/**
 * Get all active geofence zones
 */
export const getActiveZones = async (): Promise<GeofenceZone[]> => {
  const { data, error } = await supabase
    .from("geofence_zones")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data as GeofenceZone[]) || [];
};
