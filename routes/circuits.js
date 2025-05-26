import express from 'express';
import { getAllCircuits, getCircuitById } from '../controllers/circuitController.js';

const router = express.Router();

// GET All Circuits
router.get('/', getAllCircuits);
// GET One Circuit
router.get('/:circuitId', getCircuitById);

export default router;
