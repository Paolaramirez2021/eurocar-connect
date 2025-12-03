import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserRole = 'socio_principal' | 'administrador' | 'comercial' | 'operativo';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  first_name?: string | null;
  last_name?: string | null;
  cedula?: string | null;
  avatar_url?: string | null;
  roles: UserRole[];
}

export const useUserRole = (user: User | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Get roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        setProfile({
          ...profileData,
          roles: rolesData.map(r => r.role as UserRole)
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const hasRole = (role: UserRole) => {
    return profile?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: UserRole[]) => {
    return profile?.roles.some(r => roles.includes(r)) || false;
  };

  const isSocio = hasRole('socio_principal');
  const isAdmin = hasRole('administrador') || isSocio;
  const isComercial = hasRole('comercial');
  const isOperativo = hasRole('operativo');

  return {
    profile,
    loading,
    hasRole,
    hasAnyRole,
    isSocio,
    isAdmin,
    isComercial,
    isOperativo
  };
};
