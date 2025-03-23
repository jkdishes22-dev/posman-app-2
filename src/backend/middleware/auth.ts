import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import * as process from "process";
import { UserService } from "@services/UserService";

config();
const secret = process.env.JWT_SECRET;

export const authMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // req.user.permissions = user.permissions;
    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      const userService = new UserService(req.db);
      const userDetails = await userService.getUserWithRolesAndPermissions(req.user.id);

      req.user.roles = userDetails.roles;
      // req.user.permissions = user.roles.flatMap(role => role.permissions);
      req.user.permissions = userDetails.permissions;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token '+ error });
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
