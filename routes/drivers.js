import express from 'express';
import { 
    getAllDrivers, getAllIds, getDriverStandings, getDriverData, updateSeasonPointsByDriverId, getEnrichedDrivers, getDriverRacesResults, 
    createDriver, updateDriverById, deleteDriverById
} from '../controllers/driversController.js';

const router = express.Router();

// GET /api/drivers
router.get('/', getAllDrivers)
// GET Drivers IDs
router.get('/ids', getAllIds)
// GET Driver Standings
router.get('/summary', getDriverStandings)
// Actualiza los puntos de temporada de un piloto por ID
router.put('/:id/season-points', updateSeasonPointsByDriverId);
// GET Enriched Driver Data (Driver + Team)
router.get('/enriched', getEnrichedDrivers);
// GET One Driver Data
router.get('/id/:id', getDriverData);
// GET Driver Races Results (All finished races)
router.get('/:id/results', getDriverRacesResults)

// POST create new driver
router.post('/', createDriver);
// PUT update driver by ID
router.put('/:id', updateDriverById);
// DELETE delete driver by ID
router.delete('/:id', deleteDriverById);


export default router;
