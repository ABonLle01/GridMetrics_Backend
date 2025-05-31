import mongoose from 'mongoose';
import schedule from 'node-schedule';
import axios from 'axios';
import moment from 'moment-timezone';
import winston from 'winston';
import Race from './models/Race.js';

const URL = process.env.BACK_URL || 'http://localhost:3000/';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new winston.transports.File({ filename: 'scheduler.log' }),
    new winston.transports.Console()
  ]
});

mongoose.set('strictQuery', true);

export async function scheduleDynamicJobs() {
  logger.info('Ejecutando scheduleDynamicJobs');

  const runDate = moment().add(1, 'minute').toDate();
  schedule.scheduleJob(runDate, () => {
    logger.info('Job de prueba ejecutado');
  });
  logger.info('Job de prueba agendado para dentro de 1 minuto');


  const now = moment();
  let totalScheduled = 0;
  
  try {
    const races = await Race.find();
    logger.info(`Encontradas ${races.length} carreras en la base de datos`);

    for (const race of races) {
      const { _id: raceId, sessions, timeZone, date: raceDate, round } = race;

      for (const session of sessions) {
        const { name, date, end_time, session_result } = session;
        const sessionKey = `${raceId}_${name}`;

        // 1) Filtramos out la clave interna "_id"
        const resultKeys = session_result
        ? Object.keys(session_result).filter(k => !k.startsWith('$') && k !== '_id' && k !== '_doc' )
        : [];

        if (resultKeys.length > 0) {
            logger.info(`↪ [${sessionKey}] saltada: session_result ya poblado`);
            continue;
        }

        // 2) Calculamos execMoment = end_time + 2h
        const execMoment = moment
        .tz(`${date} ${end_time}`, timeZone)
        .add(2, 'hours');

        if (execMoment.isBefore(now)) {
            logger.info(`↪ [${sessionKey}] saltada: execMoment (${execMoment.format()}) anterior a ahora (${now.format()})`);
            continue;
        }

        // 3) Mapeamos al endpoint
        const endpointMap = {
          'Practice 1': 'updatePractices',
          'Practice 2': 'updatePractices',
          'Practice 3': 'updatePractices',
          'Sprint Qualifying': 'updatePractices',
          'Sprint': 'updatePractices',
          'Qualifying': 'updateQualy',
          'Race': 'updateRace'
        };
        const endpoint = endpointMap[name];
        if (!endpoint) {
          logger.warn(`↪ [${sessionKey}] sin endpoint mapeado para sesión "${name}"`);
          continue;
        }

        // 4) Programar job
        const runDate = execMoment.toDate();
        schedule.scheduleJob(runDate, async () => {
          logger.info(`[${sessionKey}] Ejecutando ${endpoint} para year=${moment(raceDate).year()}, round=${round}`);
          try {
            await axios.get(`${URL}/api/race/${endpoint}/2025/${round}`);
            logger.info(`[${sessionKey}] ${endpoint} completado`);
          } catch (err) {
            logger.error(`[${sessionKey}] Error en ${endpoint}: ${err.response?.data || err.message}`);
          }
        });

        logger.info(`✔ Agendado [${sessionKey}] -> ${endpoint} a las ${execMoment.format('YYYY-MM-DD HH:mm:ss')} (${runDate.toString()})`);
        totalScheduled++;
      }
    }

    logger.info(`Total de sesiones programadas en esta ejecución: ${totalScheduled}`);
  } catch (err) {
    logger.error(`Error en scheduleDynamicJobs: ${err.stack}`);
  }
}
