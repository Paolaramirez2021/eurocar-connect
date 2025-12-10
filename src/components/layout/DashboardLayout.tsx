import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar, 
  Wrench, 
  FileText, 
  DollarSign, 
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import logoEurocar from "@/assets/logo-eurocar.png";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboardStats";
import { useDashboardRealtime } from "@/hooks/useDashboardRealtime";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

const DashboardLayout = ({ children, user }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Obtener estadísticas reales desde Supabase
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Actualizar cada 30 segundos como fallback
  });

  // Habilitar actualización en tiempo real
  useDashboardRealtime();

  const handleLogout = async () => {
    try {
      // Log the logout before signing out
      await logAudit({
        actionType: 'USER_LOGOUT',
        descripcion: 'Usuario cerró sesión'
      });

      await supabase.auth.signOut();
      toast.success("Sesión cerrada");
      navigate("/auth");
    } catch (error) {
      console.error('Error during logout:', error);
      // Still sign out even if audit log fails
      await supabase.auth.signOut();
      navigate("/auth");
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { 
      icon: Car, 
      label: "Vehículos", 
      path: "/vehicles", 
      badge: stats?.vehiculosTotal ? stats.vehiculosTotal.toString() : undefined 
    },
    { icon: Users, label: "Clientes", path: "/customers" },
    { 
      icon: Calendar, 
      label: "Alquileres", 
      path: "/rentals", 
      badge: stats?.alquileresActivos ? stats.alquileresActivos.toString() : undefined 
    },
    { icon: FileText, label: "Contratos", path: "/contracts" },
    { 
      icon: Wrench, 
      label: "Mantenimientos", 
      path: "/maintenance", 
      badge: stats?.mantenimientosPendientes ? stats.mantenimientosPendientes.toString() : undefined 
    },
    { icon: DollarSign, label: "Finanzas", path: "/finance" },
    { icon: Settings, label: "Configuración", path: "/settings" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const renderNavItems = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-all duration-200 text-left group hover:scale-[1.02]"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Top Navigation */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm transition-shadow duration-300">
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
          {/* Mobile Menu Button - Left side on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - Centered on mobile, left on desktop */}
          <div className="flex items-center justify-center flex-1 lg:flex-none lg:justify-start">
            <img 
              src={logoEurocar}
              alt="EuroCar Rental" 
              className="w-40 sm:w-48 md:w-56 lg:w-64 h-auto object-contain transition-all duration-300" 
            />
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <NotificationBell />
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-none mb-1">
                  {user?.user_metadata?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                title="Cerrar sesión"
                className="h-9 w-9 sm:h-10 sm:w-10 transition-transform hover:scale-110"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 sm:h-16" />

      <div className="flex">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="w-64 border-r min-h-[calc(100vh-4rem)] bg-card hidden lg:block transition-all duration-300">
          <nav className="space-y-1 p-4">
            {renderNavItems()}
          </nav>
        </aside>

        {/* Mobile Sidebar - Sheet/Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-left">Menú de Navegación</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 p-4">
              {renderNavItems()}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Main Content with better mobile spacing */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;