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

const SecureRoute = ({ children, roleRequired }) => {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    if (isClient) {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
      } else {
        const decodedToken = jwt.decode(token) as DecodedToken;
        if (!decodedToken || !decodedToken.roles.includes(roleRequired)) {
          router.push("/not-authorized");
        }
      }
    }
  }, [isClient, router, roleRequired]);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default SecureRoute;
