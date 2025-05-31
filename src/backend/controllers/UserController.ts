import { NextApiRequest, NextApiResponse } from "next";
import { UserService } from "@services/UserService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as process from "process";
import { v4 as uuidv4 } from "uuid";
import { User } from "@entities/User";
import { DataSource } from "typeorm";

/**
 * @swagger
 * /api/users:
 *   get:
 *     description: create user api
 *     responses:
 *       200:
 *         description: Hello World!
 */
export const createUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  const { username, password, firstName, lastName, role } = req.body;
  try {
    const newUser = await userService.createUser(
      username,
      password,
      firstName,
      lastName,
      role,
    );
    res.status(201).json(newUser);
  } catch (error: any) {
    res.status(500).json({ error: "Error creating user " + error });
  }
};

export const getUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const role = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
    const { users, total } = await userService.getUsers(role, page, pageSize);
    res.status(200).json({ users, total });
  } catch (error: any) {
    res.status(500).json({ error: "Error fetching users" + error });
  }
};

// Helper: Generate refresh token
function generateRefreshToken() {
  return uuidv4();
}

// Helper: Save refresh token to user (or a separate table if you prefer)
async function saveRefreshToken(user: User, token: string, db: DataSource) {
  user.refreshToken = token;
  await db.getRepository(User).save(user);
}

export const loginUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { username, password } = req.body;
  const userService = new UserService(req.db);
  try {
    const user = await userService.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Issue JWT (short-lived)
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });

    // Issue refresh token (long-lived)
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user, refreshToken, req.db);
    res.setHeader("Set-Cookie", `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=2592000`); // 30 days

    return res.status(200).json({ token });
  } catch (error: any) {
    res.status(500).json({ message: "Internal server error" + error.message });
  }
};

export const fetchUserStations = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { userId } = req.query;
    const users = await userService.fetchUserStations(Number(userId));
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: "Error fetching user stations" + error });
  }
};

export const addUserStation = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { station } = req.body;
    const { userId } = req.query;

    const userStationRequest = {
      station,
      user: userId,
    };

    const newUserStation = await userService.addUserStation(userStationRequest);
    res.status(201).json(newUserStation);
  } catch (error: any) {
    console.error("Error creating user station:", error);
    res.status(500).json({ error: "Error creating user station" + error });
  }
};

export const setDefaultUserStation = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { stationId } = req.body;
    const { userId } = req.query;
    const currentUserId = req.user?.id;

    const userStationRequest = {
      station: Number(stationId),
      user: Number(userId),
    };

    const updatedUserStation = await userService.setDefaultStation(
      userStationRequest,
      Number(currentUserId),
    );
    res.status(200).json(updatedUserStation);
  } catch (error: any) {
    res.status(500).json({ error: "Error updating user station" + error });
  }
};

export const disableUserStation = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);

  try {
    const { userStationId } = req.body;
    const currentUser = req.user?.id;

    const userStationRequest = {
      userStation: userStationId,
    };

    const updatedUserStation = await userService.disableUserStation(
      userStationRequest,
      Number(currentUser),
    );
    res.status(200).json(updatedUserStation);
  } catch (error: any) {
    res.status(500).json({ error: "Error disabling user station" + error });
  }
};

export const deleteUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const user = await userService.softDeleteUser(Number(userId));
    res.status(200).json(user);
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error deleting user: " + error.message });
    }
  }
};

export const reactivateUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const user = await userService.reactivateUser(Number(userId));
    res.status(200).json(user);
  } catch (error: any) {
    if (error.message === "User not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Error reactivating user: " + error.message });
    }
  }
};

export const updateOrLockUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const userService = new UserService(req.db);
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const action = req.body.action;
    if (action === "update") {
      const { firstName, lastName, username } = req.body;
      const user = await userService.updateUser(Number(userId), { firstName, lastName, username });
      return res.status(200).json(user);
    } else if (action === "lock") {
      const user = await userService.lockUser(Number(userId));
      return res.status(200).json(user);
    } else if (action === "unlock") {
      const user = await userService.unlockUser(Number(userId));
      return res.status(200).json(user);
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error: any) {
    res.status(500).json({ error: "Error updating/locking user: " + error.message });
  }
};
