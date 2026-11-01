import { Router } from "express";
import { generateApiKey, getApiKey, revokeApiKey } from "../controllers/apiKeyController";
import { getProjectHealth, listProjectRequests } from "../controllers/projectOperationsController";
import { createProject, deleteProject, listProjects, updateProject } from "../controllers/projectController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);
router.get("/", listProjects);
router.post("/", createProject);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);
router.get("/:projectId/requests", listProjectRequests);
router.get("/:projectId/health", getProjectHealth);
router.post("/:projectId/api-key", generateApiKey);
router.get("/:projectId/api-key", getApiKey);
router.delete("/:projectId/api-key", revokeApiKey);

export default router;