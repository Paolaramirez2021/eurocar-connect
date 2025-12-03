-- Add cliente alert status to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS alerta_cliente text DEFAULT 'ninguna' CHECK (alerta_cliente IN ('ninguna', 'positivo', 'negativo'));