import { useUserRole } from "@/hooks/useUserRole";
import { PublicNavigation } from "./PublicNavigation";
import { UserNavigation } from "./UserNavigation";
import { AdminNavigation } from "./AdminNavigation";

export const RoleBasedNavigation = () => {
  const { user, isAdmin, loading } = useUserRole();

  if (loading) {
    return <div className="h-16 border-b" />; // Placeholder while loading
  }

  if (!user) {
    return <PublicNavigation />;
  }

  if (isAdmin) {
    return <AdminNavigation />;
  }

  return <UserNavigation />;
};
