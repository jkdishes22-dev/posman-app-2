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
      return res.status(401).json({ message: "Invalid token", object: error });
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
