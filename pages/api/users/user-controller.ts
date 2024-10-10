import { NextApiRequest, NextApiResponse } from 'next';
import { UserService } from '@services/user-service';

const userService = new UserService();

export const createUserHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { username, password, firstName, lastName } = req.body;
    try {
        const newUser = await userService.createUser(username, password, firstName, lastName);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' + error });
    }
};

export const getUsersHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const users = await userService.getUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' + error });
    }
};
