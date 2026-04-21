import { NextApiRequest, NextApiResponse } from "next";
import { PricelistUploadService, RowConfirmation } from "@services/PricelistUploadService";
import formidable from "formidable";
import fs from "fs";
import { handleApiError } from "@backend/utils/errorHandler";

export const validateUploadFileHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const uploadService = new PricelistUploadService(req.db);
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const rows = await uploadService.parseUploadFile(fileBuffer, file.originalFilename || "");

    try {
      fs.unlinkSync(file.filepath);
    } catch {
      // ignore unlink errors
    }

    const validationResult = await uploadService.validateUploadData(rows);
    res.status(200).json(validationResult);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "validating",
      resource: "upload file",
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const uploadPricelistItemsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const uploadService = new PricelistUploadService(req.db);
  try {
    const { rows, userConfirmations } = req.body;
    const userId = parseInt(req.user.id, 10);

    if (!rows || !userConfirmations) {
      return res.status(400).json({ error: "Missing rows or user confirmations" });
    }

    // Build confirmations Map from the array sent by the client
    const confirmationsMap = new Map<number, RowConfirmation>();
    if (Array.isArray(userConfirmations)) {
      userConfirmations.forEach((conf: any) => {
        if (conf && typeof conf === "object" && conf.action) {
          confirmationsMap.set(Number(conf.index), {
            action: conf.action,
            matchedItemId: conf.matchedItemId ?? null,
          });
        }
      });
    }

    const result = await uploadService.processUpload(rows, confirmationsMap, userId);
    res.status(200).json(result);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "processing",
      resource: "upload",
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

export const downloadTemplateHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const uploadService = new PricelistUploadService(req.db);
  try {
    const pricelistId = parseInt(req.query.pricelistId as string, 10);
    if (isNaN(pricelistId)) {
      return res.status(400).json({ error: "Invalid pricelist ID" });
    }

    const pricelist = await uploadService.getPricelist(pricelistId);
    const pricelistCode = pricelist?.code ?? "PRICELIST_CODE";
    const csv = uploadService.generateTemplate(pricelistCode);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"pricelist-upload-template.csv\""
    );
    res.status(200).send(csv);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "generating",
      resource: "upload template",
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};
