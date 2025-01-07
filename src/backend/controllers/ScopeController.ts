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

export const fetchScopePermisionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    const { scopeId } = req.query;
    const scopePermisions = await scopeService.fetchScopePermissions(parseInt(scopeId));
    res.status(200).json(scopePermisions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scope permissions" , error });
  }
};
