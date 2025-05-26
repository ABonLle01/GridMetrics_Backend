import express from 'express';
import { process_sessions, get_qualifying, get_race } from '../controllers/scriptController.js';

const router = express.Router();

router.get('/process_sessions/:year/:round', process_sessions);
router.get('/updateQualy/:year/:round', get_qualifying);
router.get('/updateRace/:year/:round', get_race);

export default router;
