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

// Use same secret as login endpoint (with fallback)
const secret = process.env.JWT_SECRET || "4d7f12a75ea5f8fb40e8540264d47610d8aef0af421fa8643e3fdb5eb92f69ba";

interface CachedUserDetails {
  roles: any[];
  permissions: any[];
}

const userCache = new NodeCache({ stdTTL: 60 * 60 }); // 30 minutes

/** Drop cached roles/permissions for one user (e.g. after role assignment). */
export function invalidateAuthUserDetailsCacheForUser(userId: number): void {
  userCache.del(`user_${userId}`);
}

/** Drop all cached roles/permissions (e.g. after role–permission matrix changes). */
export function invalidateAuthUserDetailsCache(): void {
  userCache.flushAll();
}

export const authMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { licenseService } = await import("@backend/licensing/LicenseService");
      const licenseStatus = await licenseService.getStatus();
      if (licenseStatus.state !== "ready") {
        const statusCode =
          licenseStatus.state === "license_required" || licenseStatus.state === "license_expired"
            ? 402
            : 403;
        return res.status(statusCode).json({
          message: licenseStatus.message,
          code: licenseStatus.code,
        });
      }

      const token = req.headers.authorization?.split(" ")[1];
      if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify token with better error handling
      let decoded: { id: string };
      try {
        decoded = jwt.verify(token, secret) as { id: string };
      } catch (verifyError: any) {
        console.error("JWT verification failed:", verifyError.message);
        console.error("Token (first 20 chars):", token?.substring(0, 20));
        console.error("Secret configured:", secret ? "Yes" : "No");
        throw verifyError;
      }

      req.user = { id: decoded.id, roles: [], permissions: [] };

      const cacheKey = `user_${parseInt(req.user.id, 10)}`;
      const cachedUserDetails = userCache.get<CachedUserDetails>(cacheKey);

      if (cachedUserDetails) {
        req.user.roles = cachedUserDetails.roles;
        req.user.permissions = cachedUserDetails.permissions;
      } else {
        try {
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
        } catch (dbError: any) {
          // Database error loading user details - log but don't fail auth
          // Token is valid, so allow request to proceed with empty roles/permissions
          // This prevents logout loops when database calls fail right after login
          console.error("Error loading user details in auth middleware:", dbError);
          console.error("User ID from token:", req.user.id);
          // req.user already has id set, roles and permissions will be empty arrays
          // This allows the request to proceed - individual endpoints can handle missing data
        }
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
        const userRoles = req.user.roles.map((role) => role.name);
        const isAdmin = userRoles.includes("admin");

        // Admin has system-wide access — bypass all permission checks
        if (isAdmin) return handler(req, res);

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
