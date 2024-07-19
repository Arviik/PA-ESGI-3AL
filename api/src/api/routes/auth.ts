import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { generateTokens, hashToken } from "../../utils/token";
import { authMiddleware } from "../middlewares/auth-middleware";
import {
  addRefreshTokenToWhitelist,
  deleteRefreshToken,
  findMembersByUserId,
  findRefreshTokenById,
  revokeTokens,
} from "../services/auth-services";
import {
  findUserByEmail,
  findUserById,
  getSafeUserById,
  verifyUserPassword,
} from "../services/users-services";
import {
  loginValidation,
  refreshTokenValidation,
  revokeRefreshTokenValidation,
} from "../validators/auth-validator";

export const initAuth = (app: express.Express) => {
  app.post(
    "/auth/login",
    async (req: express.Request, res: express.Response) => {
      try {
        const validation = loginValidation.validate(req.body);
        if (validation.error) {
          return res.status(400).send({ error: validation.error });
        }

        const loginRequest = validation.value;
        const user = await verifyUserPassword(
          loginRequest.email,
          loginRequest.password
        );

        if (!user) {
          return res.status(403).send({ error: "Invalid login credentials" });
        }

        const jti = uuidv4();
        const { accessToken, refreshToken } = generateTokens(
          user,
          jti,
          user.memberships
        );
        await addRefreshTokenToWhitelist({
          jti,
          refreshToken,
          userId: user.id,
        });

        req.headers.authorization = `Bearer ${accessToken}`;
        console.log(req.headers)
        return res.json({ accessToken, refreshToken });
      } catch (error) {
        console.error(error);
        return res.status(500).send({ error: error });
      }
    }
  );

  app.post(
    "/auth/refreshToken",
    async (req: express.Request, res: express.Response) => {
      try {
        const validation = refreshTokenValidation.validate(req.body);
        if (validation.error) {
          return res.status(400).send({ error: validation.error });
        }

        const refreshTokenRequest = validation.value;
        const payload: any = jwt.verify(
          refreshTokenRequest.token,
          process.env.JWT_REFRESH_SECRET!
        );
        const savedRefreshToken = await findRefreshTokenById(payload.jti);
        if (!savedRefreshToken || savedRefreshToken.revoked === true) {
          return res.status(401).send({ error: "Refresh token revoked" });
        }

        const hashedToken = hashToken(refreshTokenRequest.token);
        if (hashedToken !== savedRefreshToken.hashed_token) {
          return res.status(401).send({ error: "Refresh token invalid" });
        }

        const user = await getSafeUserById(payload.userId);
        if (!user) {
          return res.status(401).send({ error: "Refresh token invalid" });
        }

        await deleteRefreshToken(savedRefreshToken.id);
        const jti = uuidv4();
        const userMemberships = user.memberships;
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(
          user,
          jti,
          userMemberships
        );
        await addRefreshTokenToWhitelist({
          jti,
          refreshToken: newRefreshToken,
          userId: user.id,
        });

        return res.json({
          accessToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        return res.status(400).send({ error: "Refresh token invalid" });
      }
    }
  );

  app.post(
    "/auth/revokeRefreshToken",
    async (req: express.Request, res: express.Response) => {
      try {
        const validation = revokeRefreshTokenValidation.validate(req.body);
        if (validation.error) {
          return res.status(400).send({ error: validation.error });
        }

        const revokeRefreshTokenRequest = validation.value;
        await revokeTokens(revokeRefreshTokenRequest.userId);

        return res.json({
          message: `Refresh token revoked for user with id #${revokeRefreshTokenRequest.userId}`,
        });
      } catch (error) {
        return res.status(500).send({ error: error });
      }
    }
  );

  app.get(
    "/auth/check",
    authMiddleware,
    async (req: express.Request, res: express.Response) => {
      try {
        const payload = (req as any).payload;
        return res.json(payload);
      } catch (error) {
        return res.status(500).send({ error: error });
      }
    }
  );
};
