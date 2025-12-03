import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Database, CheckCircle, XCircle, Loader2, ArrowLeft, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const TABLES = [
  { name: 'vehicles', description: 'Vehículos de la flota' },
  { name: 'reservations', description: 'Reservas de clientes' },
  { name: 'customers', description: 'Clientes registrados' },
  { name: 'contracts', description: 'Contratos firmados' },
  { name: 'maintenance', description: 'Registros de mantenimiento' },
  { name: 'maintenance_schedules', description: 'Programación de mantenimiento' },
  { name: 'alerts', description: 'Alertas del sistema' },
  { name: 'alerts_maintenance', description: 'Alertas de mantenimiento' },
  { name: 'finance_items', description: 'Items financieros' },
  { name: 'checklist_templates', description: 'Plantillas de checklist' },
  { name: 'checklist_template_items', description: 'Items de plantillas' },
  { name: 'checklists', description: 'Checklists completados' },
  { name: 'checklist_items', description: 'Items de checklists' },
  { name: 'pico_placa_payments', description: 'Pagos pico y placa' },
  { name: 'devolucion_videos', description: 'Videos de devolución' },
  { name: 'geofence_zones', description: 'Zonas de geofence' },
  { name: 'time_entries', description: 'Registros de tiempo' },
  { name: 'settings', description: 'Configuraciones' },
  { name: 'agents', description: 'Agentes API' },
  { name: 'audit_log', description: 'Log de auditoría' },
  { name: 'notifications', description: 'Notificaciones' },
  { name: 'profiles', description: 'Perfiles de usuario' },
  { name: 'user_roles', description: 'Roles de usuario' },
];

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';
type ExportFormat = 'json' | 'csv';

interface TableExportState {
  status: ExportStatus;
  count?: number;
  error?: string;
}

export default function AdminExport() {
  const [exportStates, setExportStates] = useState<Record<string, TableExportState>>({});
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

  const updateTableState = (table: string, state: Partial<TableExportState>) => {
    setExportStates(prev => ({
      ...prev,
      [table]: { ...prev[table], ...state }
    }));
  };

  const exportTable = async (tableName: string, format: ExportFormat = exportFormat) => {
    updateTableState(tableName, { status: 'loading' });
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-table?table=${tableName}&format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      let recordCount = 0;

      if (format === 'csv') {
        const csvData = await response.text();
        // Count lines minus header
        const lines = csvData.split('\n').filter(line => line.trim());
        recordCount = Math.max(0, lines.length - 1);
        
        // Download CSV
        const blob = new Blob([csvData], { type: 'text/csv; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const jsonData = await response.json();
        recordCount = Array.isArray(jsonData) ? jsonData.length : 0;
        
        // Download JSON
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tableName}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      updateTableState(tableName, { 
        status: 'success', 
        count: recordCount 
      });
      
      toast.success(`${tableName} exportado: ${recordCount} registros (${format.toUpperCase()})`);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error(`Error exporting ${tableName}:`, err);
      updateTableState(tableName, { status: 'error', error: err.message });
      toast.error(`Error exportando ${tableName}: ${err.message}`);
    }
  };

  const exportAllTables = async () => {
    setIsExportingAll(true);
    
    for (const table of TABLES) {
      await exportTable(table.name, exportFormat);
      // Small delay between exports to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsExportingAll(false);
    toast.success(`Exportación completa de todas las tablas (${exportFormat.toUpperCase()})`);
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Exportar Base de Datos</h1>
            <p className="text-muted-foreground mt-1">
              Descarga cada tabla en formato JSON o CSV para importar a Supabase
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Tablas Disponibles
                </CardTitle>
                <CardDescription>
                  Selecciona el formato y descarga las tablas
                </CardDescription>
              </div>
              <Button 
                onClick={exportAllTables} 
                disabled={isExportingAll}
                size="lg"
              >
                {isExportingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Todo ({exportFormat.toUpperCase()})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)} className="mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV (Recomendado)
                </TabsTrigger>
                <TabsTrigger value="json" className="flex items-center gap-2">
                  <FileJson className="h-4 w-4" />
                  JSON
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv" className="mt-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Formato CSV - Ideal para Supabase</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>✓ Headers con nombres de columnas exactos</li>
                    <li>✓ Valores JSONB convertidos a strings escapados</li>
                    <li>✓ UUIDs y timestamps en formato correcto</li>
                    <li>✓ Compatible con importación directa en Supabase</li>
                  </ul>
                </div>
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Formato JSON - Para referencia</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>✓ Estructura jerárquica completa</li>
                    <li>✓ Ideal para análisis y manipulación</li>
                    <li>✓ Requiere conversión para importar</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TABLES.map((table) => {
                const state = exportStates[table.name] || { status: 'idle' };
                
                return (
                  <div 
                    key={table.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{table.name}</span>
                        {getStatusIcon(state.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {table.description}
                      </p>
                      {state.status === 'success' && state.count !== undefined && (
                        <Badge variant="secondary" className="mt-1">
                          {state.count} registros
                        </Badge>
                      )}
                      {state.status === 'error' && state.error && (
                        <p className="text-xs text-red-500 mt-1">{state.error}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportTable(table.name, 'csv')}
                        disabled={state.status === 'loading' || isExportingAll}
                        title="Descargar CSV"
                      >
                        {state.status === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportTable(table.name, 'json')}
                        disabled={state.status === 'loading' || isExportingAll}
                        title="Descargar JSON"
                      >
                        <FileJson className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instrucciones de Importación CSV en Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Descarga los archivos CSV de las tablas que necesites</li>
              <li>Ve a tu proyecto de Supabase → Table Editor</li>
              <li>Selecciona la tabla destino</li>
              <li>Haz clic en "Import data from CSV"</li>
              <li>Sube el archivo CSV correspondiente</li>
              <li>Verifica que las columnas coincidan y confirma la importación</li>
            </ol>
            
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚠️ Orden de Importación Recomendado</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                Para evitar errores de foreign keys, importa en este orden:
              </p>
              <ol className="text-sm text-amber-700 dark:text-amber-300 list-decimal list-inside space-y-1">
                <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">profiles</code> y <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">user_roles</code></li>
                <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">vehicles</code> y <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">customers</code></li>
                <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">reservations</code></li>
                <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">contracts</code></li>
                <li>El resto de tablas</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
