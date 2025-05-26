import express from 'express';
import { getAllTeams, getTeamIds, getTeamById, getTeamStandings, updateTeamPointsById, getEnrichedTeams, getEnrichedTeamById, getTeamRaceResults } from '../controllers/teamsController.js';

const router = express.Router();

// GET All Teams
router.get('/', getAllTeams);
// GET Teams IDs
router.get('/ids', getTeamIds);
// Obtener equipo por ID
router.get('/:id', getTeamById);
// GET Team Standings
router.get('/all/summary', getTeamStandings)
// PUT Actualiza la puntuación de un equipo por ID
router.put('/:id/points', updateTeamPointsById);
// GET All Enriched Teams (Teams + Driver)
router.get('/all/enriched', getEnrichedTeams);
// GET One Enriched Team (Team + Driver)
router.get('/id/:id', getEnrichedTeamById);
// GET Team Races Results
router.get('/:id/results', getTeamRaceResults);
export default router;
