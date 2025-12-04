-- Extend profiles table with additional fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS cedula TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create time_entries table for clock in/out tracking
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  method TEXT NOT NULL CHECK (method IN ('MANUAL', 'AUTOMATIC', 'BIOMETRIC')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create geofence_zones table for configurable location zones
CREATE TABLE IF NOT EXISTS public.geofence_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries"
ON public.time_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time entries"
ON public.time_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and socios can view all time entries"
ON public.time_entries
FOR SELECT
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

CREATE POLICY "Admins can manage all time entries"
ON public.time_entries
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role));

-- RLS Policies for geofence_zones
CREATE POLICY "Everyone can view active geofence zones"
ON public.geofence_zones
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and socios can manage geofence zones"
ON public.geofence_zones
FOR ALL
USING (has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role]));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON public.time_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON public.time_entries(type);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_active ON public.geofence_zones(is_active);

-- Add trigger for geofence_zones updated_at
CREATE TRIGGER update_geofence_zones_updated_at
BEFORE UPDATE ON public.geofence_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if coordinates are within geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_zone_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distance DECIMAL;
  v_radius INTEGER;
BEGIN
  -- If zone_id is provided, check specific zone
  IF p_zone_id IS NOT NULL THEN
    SELECT 
      (6371000 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(latitude)) * 
        cos(radians(longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(latitude))
      )),
      radius_meters
    INTO v_distance, v_radius
    FROM public.geofence_zones
    WHERE id = p_zone_id AND is_active = true;
    
    RETURN v_distance <= v_radius;
  END IF;
  
  -- Otherwise, check if within any active zone
  RETURN EXISTS (
    SELECT 1
    FROM public.geofence_zones
    WHERE is_active = true
    AND (6371000 * acos(
      cos(radians(p_latitude)) * 
      cos(radians(latitude)) * 
      cos(radians(longitude) - radians(p_longitude)) + 
      sin(radians(p_latitude)) * 
      sin(radians(latitude))
    )) <= radius_meters
  );
END;
$$;