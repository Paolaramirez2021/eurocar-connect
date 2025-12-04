-- Add observaciones column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS observaciones text;