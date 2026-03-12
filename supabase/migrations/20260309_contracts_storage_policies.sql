-- ===========================================================================
-- CONFIGURACIÓN DE SUPABASE STORAGE PARA CONTRATOS
-- ===========================================================================
-- Este script configura el bucket y políticas de acceso para contratos

-- Primero, crear el bucket si no existe (se hace desde el dashboard de Supabase)
-- Dashboard → Storage → Create a new bucket
-- Name: contracts
-- Public: No (privado, solo accesible con políticas)

-- ===========================================================================
-- POLÍTICAS DE STORAGE PARA EL BUCKET "contracts"
-- ===========================================================================

-- 1. Permitir INSERTAR archivos (subida de contratos, firmas, huellas, fotos)
CREATE POLICY "Users can upload contracts and signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' AND
  (
    -- Permitir subir en las carpetas especificadas
    (storage.foldername(name))[1] IN ('signatures', 'fingerprints', 'photos', 'pdf')
  )
);

-- 2. Permitir SELECCIONAR archivos (ver y descargar contratos propios)
CREATE POLICY "Users can view their own contracts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
);

-- 3. Permitir ACTUALIZAR archivos (reemplazar versiones)
CREATE POLICY "Users can update their contracts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

-- 4. Permitir ELIMINAR archivos (solo administradores)
CREATE POLICY "Only admins can delete contracts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  auth.uid() IN (
    -- Aquí puedes agregar UUIDs de usuarios administradores
    -- Ejemplo: SELECT id FROM auth.users WHERE email = 'admin@eurocar.com'
    SELECT id FROM auth.users WHERE email LIKE '%@eurocarental.com'
  )
);

-- ===========================================================================
-- POLÍTICAS RLS PARA LA TABLA CONTRACTS
-- ===========================================================================

-- Ya existe la tabla contracts, solo configuramos las políticas

-- 1. Permitir a usuarios autenticados INSERTAR contratos
CREATE POLICY "Users can create contracts" ON contracts
FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. Permitir a usuarios autenticados VER contratos
CREATE POLICY "Users can view contracts" ON contracts
FOR SELECT TO authenticated
USING (true);

-- 3. Permitir a usuarios autenticados ACTUALIZAR contratos
CREATE POLICY "Users can update contracts" ON contracts
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Solo admin puede ELIMINAR contratos
CREATE POLICY "Only admins can delete contracts" ON contracts
FOR DELETE TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@eurocarental.com'
  )
);

-- ===========================================================================
-- FUNCIONES AUXILIARES
-- ===========================================================================

-- Función para obtener el tamaño total de contratos por usuario
CREATE OR REPLACE FUNCTION get_user_contracts_size(user_id UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(metadata->>'size')::BIGINT, 0)
  FROM storage.objects
  WHERE bucket_id = 'contracts'
    AND owner = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Función para limpiar contratos antiguos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_contracts()
RETURNS void AS $$
BEGIN
  -- Eliminar contratos con más de 2 años y estado 'cancelled'
  DELETE FROM contracts
  WHERE created_at < NOW() - INTERVAL '2 years'
    AND status = 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- ===========================================================================

-- Índice para búsquedas por reservation_id
CREATE INDEX IF NOT EXISTS idx_contracts_reservation 
ON contracts(reservation_id);

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_contracts_customer_document 
ON contracts(customer_document);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_contracts_status 
ON contracts(status);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_contracts_created_at 
ON contracts(created_at DESC);

-- ===========================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ===========================================================================
/*
PASOS PARA CONFIGURAR EN SUPABASE:

1. Dashboard → Storage → Create bucket "contracts"
   - Name: contracts
   - Public: NO (desmarcar)
   - File size limit: 50MB
   - Allowed MIME types: image/png, image/jpeg, application/pdf

2. Ejecutar este script SQL en:
   Dashboard → SQL Editor → New Query → Pegar y ejecutar

3. Verificar que las políticas se crearon:
   Dashboard → Authentication → Policies

4. Probar subida de archivos:
   - Firma: contracts/signatures/test.png
   - Huella: contracts/fingerprints/test.png
   - Foto: contracts/photos/test.jpg
   - PDF: contracts/pdf/test.pdf

5. Configurar CORS si es necesario:
   Dashboard → Storage → contracts → Settings → CORS

ESTRUCTURA DE CARPETAS:
contracts/
├── signatures/     # Firmas digitales (PNG)
├── fingerprints/   # Huellas digitales (PNG)
├── photos/         # Fotos de clientes (JPEG)
└── pdf/            # Contratos PDF finales (PDF)
*/
