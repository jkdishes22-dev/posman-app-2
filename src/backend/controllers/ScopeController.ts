import { NextApiRequest, NextApiResponse } from "next";
import { ScopeService } from "@services/ScopeService";
import { handleApiError } from "@backend/utils/errorHandler";

export const fetchScopesHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const scopeService = new ScopeService(req.db);
  try {
    const scopes = await scopeService.fetchScopes();
    res.status(200).json(scopes);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "scopes"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const fetchScopePermisionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const scopeService = new ScopeService(req.db);
  try {
    const { scopeId } = req.query;
    const scopePermisions = await scopeService.fetchScopePermissions(
      parseInt(scopeId as string),
    );
    res.status(200).json(scopePermisions);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "fetching",
      resource: "scope permissions"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
