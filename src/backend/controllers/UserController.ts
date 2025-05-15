import { NextApiRequest, NextApiResponse } from "next";
import { UserService } from "@services/UserService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as process from "process";

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
    const users = await userService.getUsers(role);
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: "Error fetching users" + error });
  }
};

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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
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
