import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { CustomersList } from "@/components/customers/CustomersList";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { CustomerDetail } from "@/components/customers/CustomerDetail";
import { GPTApiDocs } from "@/components/customers/GPTApiDocs";
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "list" | "new" | "edit" | "detail" | "api";

const Customers = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
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

  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setCurrentView("new");
  };

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCurrentView("detail"); // Show detail view first instead of direct edit
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCurrentView("detail");
  };

  const handleEditFromDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setCurrentView("edit");
  };

  const handleSuccess = () => {
    setCurrentView("list");
    setSelectedCustomer(null);
  };

  const handleCancel = () => {
    setCurrentView("list");
    setSelectedCustomer(null);
  };

  return (
    <DashboardLayout user={user}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground">
              Administra tu base de datos de clientes
            </p>
          </div>
        </div>

        {/* Tabs for views */}
        <Tabs value={currentView === "detail" ? "list" : currentView} onValueChange={(v) => {
          if (v === "list" || v === "new" || v === "api") {
            setCurrentView(v as View);
            setSelectedCustomer(null);
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Listado</TabsTrigger>
            <TabsTrigger value="new">Nuevo Cliente</TabsTrigger>
            <TabsTrigger value="api">API GPT</TabsTrigger>
          </TabsList>

          {/* Stats - Show in list and api views */}
          {(currentView === "list" || currentView === "api") && (
            <div className="mt-6">
              <CustomerStats />
            </div>
          )}

          <TabsContent value="list" className="mt-6">
            {currentView === "list" && (
              <CustomersList
                onSelectCustomer={handleSelectCustomer}
                onEditCustomer={handleEditCustomer}
                onNewCustomer={handleNewCustomer}
              />
            )}
            {currentView === "detail" && selectedCustomer && (
              <CustomerDetail
                customerId={selectedCustomer.id}
                onBack={handleCancel}
                onEdit={() => handleEditFromDetail(selectedCustomer)}
              />
            )}
          </TabsContent>

          <TabsContent value="new" className="mt-6">
            {(currentView === "new" || currentView === "edit") && (
              <CustomerForm
                customer={selectedCustomer}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <GPTApiDocs />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
