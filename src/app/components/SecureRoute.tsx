"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import jwt from "jsonwebtoken";

export interface DecodedToken {
  id: number;
  user: Record<string, string>;
  roles: string[];
  iat?: number;
  exp?: number;
}

const SecureRoute = ({ children, roleRequired, allowAnyAuthenticated = false }) => {
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
      router.push("/login");
    } else {
      const decodedToken = jwt.decode(token) as DecodedToken | null;
      if (!decodedToken) {
        router.push("/login");
      } else if (!allowAnyAuthenticated && (!Array.isArray(decodedToken.roles) || !decodedToken.roles.includes(roleRequired))) {
        router.push("/not-authorized");
      }
    }
  }, [isClient, router, roleRequired, allowAnyAuthenticated]);

  if (!isClient) {
    return null; // or a loading spinner
  }

  return <>{children}</>;
};

export default SecureRoute;
