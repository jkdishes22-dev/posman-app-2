import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";
import { UserService } from "@backend/service/UserService";
import * as process from "process";
import jwt from "jsonwebtoken";

interface AuthUser {
  id: string;
  roles: any[];
  permissions: any[];
}

declare module "next" {
  interface NextApiRequest {
    user: AuthUser;
  }
}

// const secret = process.env.JWT_SECRET;
interface CachedUserDetails {
  roles: any[];
  permissions: any[];
}

const userCache = new NodeCache({ stdTTL: 60 * 60 }); // 30 minutes

export const authMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };
      req.user = { id: decoded.id, roles: [], permissions: [] };

      const cacheKey = `user_${parseInt(req.user.id, 10)}`;
      const cachedUserDetails = userCache.get<CachedUserDetails>(cacheKey);

      if (cachedUserDetails) {
        req.user.roles = cachedUserDetails.roles;
        req.user.permissions = cachedUserDetails.permissions;
      } else {
        const userService = new UserService(req.db);
        const userDetails = await userService.getUserWithRolesAndPermissions(
          parseInt(req.user.id, 10),
        );
        req.user.roles = userDetails.roles;
        req.user.permissions = userDetails.permissions;

        // Store user roles and permissions in cache
        userCache.set(cacheKey, {
          roles: userDetails.roles,
          permissions: userDetails.permissions,
        });
      }
      return handler(req, res);
    } catch (error: any) {
      // For invalid token, return 401 but try to include user info if available from token decode attempt
      let userRoles: string[] = [];
      let isAdmin = false;
      
      try {
        // Try to decode token to get user info even if verification failed
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
          const decoded = jwt.decode(token) as any;
          if (decoded?.roles) {
            // Handle both array and single role formats, and both string and object formats
            let rolesArray: any[] = [];
            if (Array.isArray(decoded.roles)) {
              rolesArray = decoded.roles;
            } else {
              rolesArray = [decoded.roles];
            }
            
            // Extract role names (handle both string roles and object roles with 'name' property)
            userRoles = rolesArray.map((role: any) => {
              if (typeof role === "string") {
                return role;
              } else if (role?.name) {
                return role.name;
              } else {
                return String(role);
              }
            });
            
            isAdmin = userRoles.some((role: string) => role.toLowerCase() === "admin");
          }
        }
      } catch (decodeError) {
        // Ignore decode errors
      }
      
      return res.status(401).json({ 
        message: "Invalid token", 
        object: error,
        userRoles: userRoles.length > 0 ? userRoles : undefined,
        isAdmin: isAdmin || undefined
      });
    }
  };
};

export const authorize = (requiredPermissions: any[]) => {
  return (handler) => {
    return async (req, res) => {
      const userPermissions = req.user.permissions.map((perm) => perm.name);
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      if (missingPermissions.length > 0) {
        // Check if user has admin role
        const userRoles = req.user.roles.map((role) => role.name);
        const isAdmin = userRoles.includes("admin");

        return res.status(403).json({
          message: "Forbidden (Missing permissions)",
          missingPermissions,
          isAdmin,
          userRoles,
          requiredPermissions,
        });
      }
      return handler(req, res);
    };
  };
};
