import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserService } from "@services/user-service";
import { User } from "@entities/User";
import * as process from "process";

const userService = new UserService();

export const createUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { username, password, firstName, lastName } = req.body;
  try {
    const newUser = await userService.createUser(
      username,
      password,
      firstName,
      lastName,
    );
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Error creating user" + error });
  }
};

export const getUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" + error });
  }
};

export const loginUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const { username, password } = req.body;

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
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error.message });
  }
};
