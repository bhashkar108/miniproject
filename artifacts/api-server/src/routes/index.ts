import { Router, type IRouter } from "express";
import authRouter from "./auth";
import equationsRouter from "./equations";
import formsRouter from "./forms";
import healthRouter from "./health";
import profileRouter from "./profile";
import progressRouter from "./progress";
import quizzesRouter from "./quizzes";
import teacherRouter from "./teacher";
import voiceRoomsRouter from "./voiceRooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(teacherRouter);
router.use(formsRouter);
router.use(equationsRouter);
router.use(quizzesRouter);
router.use(progressRouter);
router.use(voiceRoomsRouter);

export default router;
