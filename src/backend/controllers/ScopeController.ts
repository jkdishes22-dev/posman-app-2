import { NextApiRequest, NextApiResponse } from "next";
import { ScopeService } from "@services/ScopeService";

const scopeService = new ScopeService();

export const fetchScopesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const scopes = await scopeService.fetchScopes();
    res.status(200).json(scopes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scopes", error });
  }
};
