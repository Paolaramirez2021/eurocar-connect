-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  reservation_id UUID REFERENCES public.reservations(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  
  -- Customer data (snapshot at signing time)
  customer_name TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Contract details
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL NOT NULL,
  
  -- Signatures and biometrics
  signature_url TEXT NOT NULL,
  fingerprint_url TEXT,
  
  -- Contract terms
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_text TEXT NOT NULL,
  
  -- Security and tracking
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  
  -- PDF and status
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('signed', 'active', 'completed', 'cancelled')),
  
  -- Offline sync
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  was_offline BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Immutability flag
  is_locked BOOLEAN NOT NULL DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_contracts_reservation ON public.contracts(reservation_id);
CREATE INDEX idx_contracts_vehicle ON public.contracts(vehicle_id);
CREATE INDEX idx_contracts_customer ON public.contracts(customer_id);
CREATE INDEX idx_contracts_signed_at ON public.contracts(signed_at DESC);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- Function to generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.contracts
  WHERE contract_number LIKE 'CTR-' || year_part || '-%';
  
  RETURN 'CTR-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate contract number
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_contract_number
BEFORE INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION set_contract_number();

-- Trigger to prevent updates after signing (immutability)
CREATE OR REPLACE FUNCTION prevent_contract_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot modify a locked contract. Contract ID: %', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_contract_modification
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION prevent_contract_modification();

-- Trigger for updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized roles can create contracts"
ON public.contracts FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role, 'comercial'::app_role, 'operativo'::app_role])
);

CREATE POLICY "Only admins can update unlocked contracts"
ON public.contracts FOR UPDATE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
  AND is_locked = false
);

CREATE POLICY "Admins can delete contracts"
ON public.contracts FOR DELETE
TO authenticated
USING (
  has_any_role(auth.uid(), ARRAY['socio_principal'::app_role, 'administrador'::app_role])
);

-- Audit log for contract signing
CREATE OR REPLACE FUNCTION log_contract_signing()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_audit(
    'CONTRACT_SIGNED',
    'contracts',
    NEW.id,
    NULL,
    jsonb_build_object(
      'contract_number', NEW.contract_number,
      'customer_name', NEW.customer_name,
      'vehicle_id', NEW.vehicle_id,
      'total_amount', NEW.total_amount,
      'was_offline', NEW.was_offline
    ),
    'Contract signed: ' || NEW.contract_number
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_contract_signing
AFTER INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION log_contract_signing();