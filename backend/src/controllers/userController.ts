import { Response } from "express";
import prisma from "../prismaClient";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../lib/logger";

export async function updateEmergencyContact(req: AuthRequest, res: Response) {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone are required" });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { emergencyContactName: name, emergencyContactPhone: phone },
    });

    res.json({
      emergencyContactName: user.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone,
    });
  } catch (error) {
    logger.error("Update emergency contact error", { error });
    res.status(500).json({ error: "Failed to update emergency contact" });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        displayAlias: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });
    res.json(user);
  } catch (error) {
    logger.error("Get me error", { error });
    res.status(500).json({ error: "Failed to fetch user" });
  }
}
