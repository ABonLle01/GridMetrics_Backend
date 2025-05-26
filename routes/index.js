import express from 'express';
import circuitsRouter from './circuits.js';
import driversRouter  from './drivers.js';
import racesRouter    from './races.js';
import teamsRouter    from './teams.js';
import scriptRouter   from './scripts.js';

const router = express.Router();

router.use('/circuits', circuitsRouter);
router.use('/drivers',  driversRouter);
router.use('/races',    racesRouter);
router.use('/teams',    teamsRouter);
router.use('/scripts',  scriptRouter);


export default router;
