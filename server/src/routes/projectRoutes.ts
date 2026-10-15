import { Router } from "express";
import { createProject, deleteProject, listProjects, updateProject } from "../controllers/projectController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);
router.get("/", listProjects);
router.post("/", createProject);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

export default router;