import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChecklistTemplateImport } from "@/components/checklists/ChecklistTemplateImport";
import { DeliveryChecklistForm } from "@/components/checklists/DeliveryChecklistForm";
import { ReturnChecklistForm } from "@/components/checklists/ReturnChecklistForm";
import { FileCheck, Upload, TruckIcon, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";

const Checklists = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

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
          <FileCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Checklists</h1>
            <p className="text-muted-foreground">
              Gestiona plantillas y completa checklists de entrega y devolución
            </p>
          </div>
        </div>

        <Tabs defaultValue="delivery" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4" />
              Entrega
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Devolución
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Plantilla
            </TabsTrigger>
          </TabsList>

          <TabsContent value="delivery" className="mt-6">
            <DeliveryChecklistForm />
          </TabsContent>

          <TabsContent value="return" className="mt-6">
            <ReturnChecklistForm />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <ChecklistTemplateImport />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Checklists;
