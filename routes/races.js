import express from 'express';
import { getAllRaces, getTimezones, getRaceById, getCircuitById, getFinishedRaces, getFinishedRaceById, getUpcomingRaces, getScheduleCircuitInfo, updateSesionsByRound, updateQualyfingByRound, updateRaceByRound } from '../controllers/raceController.js';

const router = express.Router();

// GET All Races
router.get('/', getAllRaces);
// GET Race Timezones
router.get('/timezones', getTimezones);
// GET One Race
router.get('/race/:raceId', getRaceById);
// GET One Circuit
router.get('/circuit/:circuitId', getCircuitById);
// GET Finished Races
router.get('/finished', getFinishedRaces);
// GET One Finished Race
router.get('/finished/:id', getFinishedRaceById);
// GET Upcoming Races
router.get('/upcoming', getUpcomingRaces);
// GET Races Schedule
router.get('/schedule', getScheduleCircuitInfo)
// GET Update Race (FPs)
router.get('/updatePractices/:year/:round', updateSesionsByRound)
// GET Update Race (Q)
router.get('/updateQualy/:year/:round', updateQualyfingByRound)
// GET Update Race (R)
router.get('/updateRace/:year/:round', updateRaceByRound)
export default router;
