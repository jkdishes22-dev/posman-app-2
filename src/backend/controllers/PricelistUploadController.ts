import { NextApiRequest, NextApiResponse } from "next";
import { PricelistUploadService } from "@services/PricelistUploadService";
import formidable from "formidable";
import fs from "fs";
import { handleApiError } from "@backend/utils/errorHandler";

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const rows = await uploadService.parseUploadFile(fileBuffer, file.originalFilename || "");

    // Clean up temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (unlinkError) {
      // Ignore unlink errors
    }

    const validationResult = await uploadService.validateUploadData(rows);

    res.status(200).json(validationResult);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "validating",
      resource: "upload file"
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
    const { validationResult, userConfirmations } = req.body;
    const userId = parseInt(req.user.id, 10);

    if (!validationResult || !userConfirmations) {
      return res.status(400).json({ error: "Missing validation result or user confirmations" });
    }

    // Convert userConfirmations array to Map
    const confirmationsMap = new Map<number, "create" | "update" | "skip">();
    if (Array.isArray(userConfirmations)) {
      userConfirmations.forEach((conf: any, index: number) => {
        if (conf && typeof conf === "object" && conf.action) {
          confirmationsMap.set(conf.index || index, conf.action);
        }
      });
    } else if (typeof userConfirmations === "object") {
      Object.entries(userConfirmations).forEach(([key, value]) => {
        const index = parseInt(key, 10);
        if (!isNaN(index) && (value === "create" || value === "update" || value === "skip")) {
          confirmationsMap.set(index, value);
        }
      });
    }

    const result = await uploadService.processUpload(
      validationResult,
      confirmationsMap,
      userId
    );

    res.status(200).json(result);
  } catch (error: any) {
    const { userMessage, errorCode } = handleApiError(error, {
      operation: "processing",
      resource: "upload"
    });
    res.status(500).json({ error: userMessage, code: errorCode });
  }
};

