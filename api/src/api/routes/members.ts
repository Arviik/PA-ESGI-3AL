import express from "express";
import { MemberStatus } from "@prisma/client";
import { prisma } from "../../utils/prisma";
import {
  memberPatchValidation,
  MemberRequest,
  memberValidation,
} from "../validators/member-validator";
import { authMiddleware } from "../middlewares/auth-middleware";
import { createInvitation } from "../services/email-service";

export const initMembers = (app: express.Express) => {
  app.get("/members", authMiddleware, async (req, res) => {
    try {
      const allMembers = await prisma.members.findMany({
        include: { user: true },
      });

      res.json(allMembers);
    } catch (e) {
      res.status(500).send({ error: e });
      return;
    }
  });

  app.get("/members/:id", authMiddleware, async (req, res) => {
    try {
      const member = await prisma.members.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (member) {
        res.status(200).json(member);
      } else {
        res.status(404).send({ error: "Member not found" });
      }
    } catch (e) {
      res.status(500).send({ error: e });
      return;
    }
  });

  app.post("/members", authMiddleware, async (req, res) => {
    const validation = memberValidation.validate(req.body);

    if (validation.error) {
      res.status(400).send({ error: validation.error.details });
      return;
    }

    const memberRequest = validation.value;
    try {
      const member = await prisma.members.create({
        data: {
          role: memberRequest.role,
          organizationId: memberRequest.organizationId,
          userId: memberRequest.userId,
        },
      });
      res.status(201).json(member);
    } catch (e) {
      res.status(500).send({ error: e });
      return;
    }
  });

  app.patch("/members/:id", authMiddleware, async (req, res) => {
    const validation = memberPatchValidation.validate(req.body);

    if (validation.error) {
      res.status(400).json({ error: validation.error.details });
      return;
    }

    const memberRequest = validation.value;
    try {
      const member = await prisma.members.update({
        where: {
          id: Number(req.params.id),
        },
        data: {
          role: memberRequest.role,
          isAdmin: memberRequest.isAdmin,
          status: memberRequest.status as MemberStatus,
          user: {
            update: {
              firstName: memberRequest.user?.firstName,
              lastName: memberRequest.user?.lastName,
              email: memberRequest.user?.email,
            },
          },
        },
      });
      res.status(200).json(member);
    } catch (e) {
      res.status(500).json({ error: e });
      return;
    }
  });

  app.delete("/members/:id", authMiddleware, async (req, res) => {
    try {
      const deletedMember = await prisma.members.delete({
        where: { id: Number(req.params.id) },
      });
      res.status(200).json(deletedMember);
    } catch (e) {
      res.status(500).send({ error: e });
    }
  });

  app.post(
    "/organizations/:organizationId/invite-member",
    authMiddleware,
    async (req, res) => {
      try {
        await createInvitation(
          Number(req.params.organizationId),
          req.body.email
        );
        res.status(201).json({ message: "Invitation sent" });
      } catch (e) {
        res.status(500).json({ error: e });
      }
    }
  );
};
