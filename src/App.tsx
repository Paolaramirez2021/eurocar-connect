import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Users from "./pages/Users";
import Checklists from "./pages/Checklists";
import Reservations from "./pages/Reservations";
import GestionReservas from "./pages/GestionReservas";
import AlertasMantenimiento from "./pages/AlertasMantenimiento";
import Maintenance from "./pages/Maintenance";
import Finance from "./pages/Finance";
import Agents from "./pages/Agents";
import Vehicles from "./pages/Vehicles";
import Contracts from "./pages/Contracts";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import AdminExport from "./pages/AdminExport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/gestion-reservas" element={<GestionReservas />} />
          <Route path="/alertas-mantenimiento" element={<AlertasMantenimiento />} />
          <Route path="/rentals" element={<Reservations />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/clients" element={<Customers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/log" element={<Dashboard />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/export" element={<AdminExport />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
