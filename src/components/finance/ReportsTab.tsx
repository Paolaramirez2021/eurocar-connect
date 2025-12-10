import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { DetailedReport } from "./DetailedReport";
import { SummaryReport } from "./SummaryReport";
import { CalendarAvailabilityReport } from "./CalendarAvailabilityReport";
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";

export const ReportsTab = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(currentDate);

  // Calcular el rango del mes seleccionado
  const dateRange = useMemo(() => ({
    from: startOfMonth(selectedMonth),
    to: endOfMonth(selectedMonth)
  }), [selectedMonth]);

  const [activeTab, setActiveTab] = useState("calendar");

  // Navegar al mes anterior
  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  // Navegar al mes siguiente
  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  // Ir al mes actual
  const handleToday = () => {
    setSelectedMonth(new Date());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Informes de Ocupación
              </CardTitle>
              <CardDescription className="mt-2">
                Analiza el rendimiento y ocupación de tu flota
              </CardDescription>
            </div>
            
            {/* Selector de Mes Mejorado con Flechas */}
            <div className="flex items-center gap-2 bg-white border rounded-lg p-2 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 min-w-[200px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm capitalize">
                  {format(selectedMonth, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="ml-2"
              >
                Hoy
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendario Mensual
              </TabsTrigger>
              <TabsTrigger value="detailed">
                <Calendar className="h-4 w-4 mr-2" />
                Informe Detallado
              </TabsTrigger>
              <TabsTrigger value="summary">
                <FileText className="h-4 w-4 mr-2" />
                Informe General
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="space-y-4">
              <CalendarAvailabilityReport dateRange={dateRange} />
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              <DetailedReport dateRange={dateRange} />
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <SummaryReport dateRange={dateRange} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
