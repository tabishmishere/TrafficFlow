import express, { Router } from "express";
import { forwardGatewayRequest } from "../controllers/gatewayController";

const router = Router({ mergeParams: true });

router.use(express.raw({ type: () => true, limit: "10mb" }));
router.all("/", forwardGatewayRequest);
router.all("/{*path}", forwardGatewayRequest);

export default router;