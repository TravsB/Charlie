import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      localUserId?: string;
    }
  }
}

export async function requireProjectUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const identity = await clerkClient.users.getUser(userId);
    const email = identity.primaryEmailAddress?.emailAddress ?? null;
    const displayName =
      identity.fullName ?? identity.username ?? null;
    const [localUser] = await db
      .insert(usersTable)
      .values({
        authProviderId: userId,
        email,
        displayName,
      })
      .onConflictDoUpdate({
        target: usersTable.authProviderId,
        set: {
          email,
          displayName,
          updatedAt: new Date(),
        },
      })
      .returning({ id: usersTable.id });

    if (!localUser) {
      res.status(503).json({ error: "User profile is unavailable" });
      return;
    }

    req.localUserId = localUser.id;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to resolve authenticated user");
    res.status(503).json({ error: "User profile is unavailable" });
  }
}
