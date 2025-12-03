import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { DetailedReport } from "./DetailedReport";
import { SummaryReport } from "./SummaryReport";
import { CalendarAvailabilityReport } from "./CalendarAvailabilityReport";
import { DateRangePicker } from "./DateRangePicker";
import { startOfMonth, endOfMonth } from "date-fns";

export const ReportsTab = () => {
  const currentDate = new Date();
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(currentDate),
    to: endOfMonth(currentDate)
  });

  const [activeTab, setActiveTab] = useState("calendar");

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
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
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
