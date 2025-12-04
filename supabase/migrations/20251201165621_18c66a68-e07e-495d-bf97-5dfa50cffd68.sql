-- Add hotel fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS hotel_hospedaje text,
ADD COLUMN IF NOT EXISTS hotel_numero_habitacion text;