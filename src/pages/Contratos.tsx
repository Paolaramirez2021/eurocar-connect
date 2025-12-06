import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ContratoPreliminar from "@/components/contratos/ContratoPreliminar";
import ContratoFinal from "@/components/contratos/ContratoFinal";
import HistorialContratos from "@/components/contratos/HistorialContratos";
import { FileText, FileCheck, History } from "lucide-react";

const Contratos = () => {
  const [activeTab, setActiveTab] = useState("preliminar");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Contratos</h1>
          <p className="text-muted-foreground">
            Sistema completo de contratos digitales con firma, huella y foto
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="preliminar" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contrato Preliminar</span>
            <span className="sm:hidden">Preliminar</span>
          </TabsTrigger>
          <TabsTrigger value="final" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Contrato Final</span>
            <span className="sm:hidden">Final</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preliminar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contrato Preliminar</CardTitle>
              <CardDescription>
                Genera el contrato preliminar para enviar al cliente antes de su visita.
                Sin firma ni huella, solo datos de reserva.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContratoPreliminar />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="final" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contrato Final con Firma Digital</CardTitle>
              <CardDescription>
                Completa el contrato con firma manuscrita, huella digital y fotografía del cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContratoFinal />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Contratos</CardTitle>
              <CardDescription>
                Consulta todos los contratos generados (preliminares y finales).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HistorialContratos />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contratos;
