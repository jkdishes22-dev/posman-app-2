"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeJwt, DecodedToken } from "../utils/tokenUtils";

export type { DecodedToken };

interface SecureRouteProps {
  children: React.ReactNode;
  roleRequired?: string;
  rolesRequired?: string[];
  allowAnyAuthenticated?: boolean;
}

const SecureRoute = ({ children, roleRequired, rolesRequired, allowAnyAuthenticated = false }: SecureRouteProps) => {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Set isClient only once on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth logic runs only when isClient is true
  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
    } else {
      const decodedToken = decodeJwt(token);
      if (!decodedToken) {
        router.push("/");
      } else if (!allowAnyAuthenticated) {
        // Support both single role and array of roles
        const allowedRoles = rolesRequired || (roleRequired ? [roleRequired] : []);
        if (allowedRoles.length > 0) {
          const hasRequiredRole = Array.isArray(decodedToken.roles) &&
            allowedRoles.some(role => decodedToken.roles.includes(role));
          if (!hasRequiredRole) {
            router.push("/not-authorized");
          }
        }
      }
    }
  }, [isClient, router, roleRequired, rolesRequired, allowAnyAuthenticated]);

  if (!isClient) {
    return null; // or a loading spinner
  }

  return <>{children}</>;
};

export default SecureRoute;
