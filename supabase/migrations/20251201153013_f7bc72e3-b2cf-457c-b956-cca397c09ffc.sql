-- Add new columns to reservations table for payment and contract tracking
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS contract_id uuid,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid,
ADD COLUMN IF NOT EXISTS auto_cancel_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS refund_status text,
ADD COLUMN IF NOT EXISTS refund_reference text,
ADD COLUMN IF NOT EXISTS refund_date timestamp with time zone;