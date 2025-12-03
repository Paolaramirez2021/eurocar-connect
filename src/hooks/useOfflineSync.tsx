import { useEffect, useState } from "react";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractData {
  id: string;
  reservationId?: string;
  vehicleId: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerEmail?: string;
  customerPhone?: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  signatureDataUrl: string;
  fingerprintDataUrl?: string;
  termsText: string;
  termsAccepted: boolean;
  signedAt: string;
  ipAddress?: string;
  userAgent: string;
}

interface OfflineContractsDB extends DBSchema {
  contracts: {
    key: string;
    value: ContractData;
  };
}

const DB_NAME = "eurocar_offline";
const DB_VERSION = 1;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const getDB = async (): Promise<IDBPDatabase<OfflineContractsDB>> => {
    return openDB<OfflineContractsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("contracts")) {
          db.createObjectStore("contracts", { keyPath: "id" });
        }
      },
    });
  };

  const saveOffline = async (contract: ContractData): Promise<void> => {
    const db = await getDB();
    await db.put("contracts", contract);
    await updatePendingCount();
    toast.info("Contrato guardado offline. Se sincronizará al restaurar conexión.");
  };

  const updatePendingCount = async () => {
    const db = await getDB();
    const count = await db.count("contracts");
    setPendingCount(count);
  };

  const uploadToSupabase = async (dataUrl: string, filename: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Upload to Supabase storage (you'll need to create buckets)
    const { data, error } = await supabase.storage
      .from("contracts")
      .upload(filename, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("contracts")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const syncPendingContracts = async (): Promise<void> => {
    if (isSyncing) return;

    setIsSyncing(true);
    const db = await getDB();
    const contracts = await db.getAll("contracts");

    if (contracts.length === 0) {
      setIsSyncing(false);
      return;
    }

    toast.info(`Sincronizando ${contracts.length} contrato(s)...`);

    let successCount = 0;
    let errorCount = 0;

    for (const contract of contracts) {
      try {
        // Upload signature
        const signatureFilename = `signatures/${contract.id}_signature_${Date.now()}.png`;
        const signatureUrl = await uploadToSupabase(
          contract.signatureDataUrl,
          signatureFilename
        );

        // Upload fingerprint if exists
        let fingerprintUrl: string | undefined;
        if (contract.fingerprintDataUrl) {
          const fingerprintFilename = `fingerprints/${contract.id}_fingerprint_${Date.now()}.png`;
          fingerprintUrl = await uploadToSupabase(
            contract.fingerprintDataUrl,
            fingerprintFilename
          );
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Insert contract into database
        const { error } = await supabase.from("contracts").insert([{
          reservation_id: contract.reservationId,
          vehicle_id: contract.vehicleId,
          customer_id: contract.customerId,
          customer_name: contract.customerName,
          customer_document: contract.customerDocument,
          customer_email: contract.customerEmail,
          customer_phone: contract.customerPhone,
          start_date: contract.startDate,
          end_date: contract.endDate,
          total_amount: contract.totalAmount,
          signature_url: signatureUrl,
          fingerprint_url: fingerprintUrl,
          terms_text: contract.termsText,
          terms_accepted: contract.termsAccepted,
          signed_at: contract.signedAt,
          signed_by: user?.id,
          ip_address: contract.ipAddress,
          user_agent: contract.userAgent,
          was_offline: true,
          status: "signed",
        } as any]);

        if (error) throw error;

        // Delete from offline storage
        await db.delete("contracts", contract.id);
        successCount++;
      } catch (error) {
        console.error("Error syncing contract:", contract.id, error);
        errorCount++;
      }
    }

    await updatePendingCount();
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} contrato(s) sincronizado(s) exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`Error al sincronizar ${errorCount} contrato(s)`);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexión restaurada. Sincronizando...");
      syncPendingContracts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Sin conexión. Los datos se guardarán localmente.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync check
    updatePendingCount();
    if (navigator.onLine) {
      syncPendingContracts();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveOffline,
    syncPendingContracts,
  };
};
