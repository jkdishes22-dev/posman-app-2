"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, getMenuItems } from "../../backend/config/role-permissions";

interface User {
  id: number;
  roles: string[];
  firstName: string;
  lastName: string;
}

interface RoleBasedRouteProps {
  children: React.ReactNode;
  user: User;
  requiredPermission?: string;
  requiredRole?: string;
  fallbackPath?: string;
}

export default function RoleBasedRoute({ 
  children, 
  user, 
  requiredPermission, 
  requiredRole, 
  fallbackPath = "/not-authorized" 
}: RoleBasedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      // Check role-based access
      if (requiredRole && !user.roles.includes(requiredRole)) {
        setIsAuthorized(false);
        return;
      }

      // Check permission-based access
      if (requiredPermission && !hasPermission(user.roles, requiredPermission)) {
        setIsAuthorized(false);
        return;
      }

      // If no specific requirements, check if user has any valid role
      if (!requiredRole && !requiredPermission) {
        const validRoles = ["admin", "supervisor", "sales", "cashier", "storekeeper"];
        const hasValidRole = user.roles.some(role => validRoles.includes(role));
        
        if (!hasValidRole) {
          setIsAuthorized(false);
          return;
        }
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [user, requiredPermission, requiredRole]);

  useEffect(() => {
    if (isAuthorized === false) {
      router.push(fallbackPath);
    }
  }, [isAuthorized, router, fallbackPath]);

  if (isAuthorized === null) {
    // Loading state
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    // This should not render as we redirect, but just in case
    return null;
  }

  return <>{children}</>;
}

// Higher-order component for role-based route protection
export function withRoleProtection(
  WrappedComponent: React.ComponentType<any>,
  options: {
    requiredPermission?: string;
    requiredRole?: string;
    fallbackPath?: string;
  }
) {
  return function RoleProtectedComponent(props: any) {
    const { user } = props;
    
    return (
      <RoleBasedRoute
        user={user}
        requiredPermission={options.requiredPermission}
        requiredRole={options.requiredRole}
        fallbackPath={options.fallbackPath}
      >
        <WrappedComponent {...props} />
      </RoleBasedRoute>
    );
  };
}

// Hook for checking permissions in components
export function usePermission(permission: string, user: User): boolean {
  return hasPermission(user.roles, permission);
}

// Hook for checking roles in components
export function useRole(role: string, user: User): boolean {
  return user.roles.includes(role);
}

// Hook for getting user's menu items
export function useMenuItems(user: User) {
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const primaryRole = user.roles[0] || "sales";
    const items = getMenuItems(primaryRole);
    setMenuItems(items);
  }, [user.roles]);

  return menuItems;
}
