import "express";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      tokenId: string;
      tokenExpiresAt: number;
    }
  }
}

export {};