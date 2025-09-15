import { NextApiRequest, NextApiResponse } from "next";
import { BillVoidService } from "@services/BillVoidService";

export const createVoidRequestHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const { billId, reason } = req.body;
    const initiatedBy = req.user?.id;

    if (!billId || !reason) {
      return res.status(400).json({ 
        error: "Bill ID and reason are required" 
      });
    }

    if (!initiatedBy) {
      return res.status(401).json({ 
        error: "User not authenticated" 
      });
    }

    const voidRequest = await billVoidService.createVoidRequest(
      billId,
      initiatedBy,
      reason
    );

    res.status(201).json({
      message: "Void request created successfully",
      voidRequest,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error creating void request: " + error.message 
    });
  }
};

export const approveVoidRequestHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const { requestId, approvalNotes, paperApprovalReceived, paperApprovalNotes } = req.body;
    const approvedBy = req.user?.id;

    if (!requestId) {
      return res.status(400).json({ 
        error: "Request ID is required" 
      });
    }

    if (!approvedBy) {
      return res.status(401).json({ 
        error: "User not authenticated" 
      });
    }

    const voidRequest = await billVoidService.approveVoidRequest(
      requestId,
      approvedBy,
      approvalNotes,
      paperApprovalReceived || false,
      paperApprovalNotes
    );

    res.status(200).json({
      message: "Void request approved successfully",
      voidRequest,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error approving void request: " + error.message 
    });
  }
};

export const rejectVoidRequestHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const { requestId, rejectionNotes } = req.body;
    const rejectedBy = req.user?.id;

    if (!requestId) {
      return res.status(400).json({ 
        error: "Request ID is required" 
      });
    }

    if (!rejectedBy) {
      return res.status(401).json({ 
        error: "User not authenticated" 
      });
    }

    const voidRequest = await billVoidService.rejectVoidRequest(
      requestId,
      rejectedBy,
      rejectionNotes
    );

    res.status(200).json({
      message: "Void request rejected successfully",
      voidRequest,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error rejecting void request: " + error.message 
    });
  }
};

export const getPendingVoidRequestsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const pendingRequests = await billVoidService.getPendingVoidRequests();
    
    res.status(200).json({
      message: "Pending void requests retrieved successfully",
      voidRequests: pendingRequests,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error retrieving pending void requests: " + error.message 
    });
  }
};

export const getVoidRequestStatsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const stats = await billVoidService.getVoidRequestStats();
    
    res.status(200).json({
      message: "Void request statistics retrieved successfully",
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error retrieving void request statistics: " + error.message 
    });
  }
};

export const getVoidRequestsByBillHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const billVoidService = new BillVoidService(req.db);
  
  try {
    const { billId } = req.query;
    
    if (!billId) {
      return res.status(400).json({ 
        error: "Bill ID is required" 
      });
    }

    const voidRequests = await billVoidService.getVoidRequestsByBill(Number(billId));
    
    res.status(200).json({
      message: "Void requests retrieved successfully",
      voidRequests,
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Error retrieving void requests: " + error.message 
    });
  }
};
