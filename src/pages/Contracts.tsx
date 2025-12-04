import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ContractForm } from "@/components/contracts/ContractForm";
import { ContractsList } from "@/components/contracts/ContractsList";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreliminaryContractForm } from "@/components/contracts/PreliminaryContractForm";

const Contracts = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contractId');
  const [activeTab, setActiveTab] = useState(contractId ? "history" : "new");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Contratos Digitales</h1>
            <p className="text-muted-foreground">
              Firma de contratos con soporte online y offline
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preliminary">Contrato Preliminar</TabsTrigger>
            <TabsTrigger value="final">Contrato Final</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="preliminary" className="mt-6">
            <PreliminaryContractForm />
          </TabsContent>

          <TabsContent value="final" className="mt-6">
            <ContractForm />
          </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Historial</TabsTrigger>
              <TabsTrigger value="api">API GPT</TabsTrigger>
            </TabsList>
            <TabsContent value="list">
              <ContractsList highlightedContractId={contractId || undefined} />
            </TabsContent>
            <TabsContent value="api">
              <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                Documentación API disponible en el módulo de Clientes
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Contracts;
