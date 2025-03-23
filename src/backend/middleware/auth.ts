import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
import { UserService } from '@backend/service/UserService';

const secret = process.env.JWT_SECRET;
const userCache = new NodeCache({ stdTTL: 60 * 60 }); // 30 minutes 

export const authMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;

      const cacheKey = `user_${req.user.id}`;
      const cachedUserDetails = userCache.get(cacheKey);

      if (cachedUserDetails) {
        req.user.roles = cachedUserDetails.roles;
        req.user.permissions = cachedUserDetails.permissions;
      } else {
        const userService = new UserService(req.db);
        const userDetails = await userService.getUserWithRolesAndPermissions(req.user.id, cacheKey);
        req.user.roles = userDetails.roles;
        req.user.permissions = userDetails.permissions;

        // Store user roles and permissions in cache
        userCache.set(cacheKey, {
          roles: userDetails.roles,
          permissions: userDetails.permissions,
        });
      }

      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
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
        return res.status(403).json({
          message: "Forbidden (Missing permissions)",
          missingPermissions,
        });
      }
      return handler(req, res);
    };
  };
};
