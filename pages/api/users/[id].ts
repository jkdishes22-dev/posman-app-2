import { NextApiRequest, NextApiResponse } from "next";
import { User } from "../../../src/backend/interfaces/user";

export default function userHandler (
    req: NextApiRequest,
    res: NextApiResponse<User>,
  ) {
    const { query, method } = req;
    const id = parseInt(query.id as string, 10);

    switch (method) {
        case "POST":

        break;
      case "GET":
        res.status(200).json({
            id: id,
            firstName: "",
            lastName: "",
            username: ""
        });
        break;
      case "PUT":
        res.status(200).json({
            id: id,
            firstName: "",
            lastName: "",
            username: ""
        });
        break;
      default:
        res.setHeader("Allow", ["GET", "PUT"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
}
