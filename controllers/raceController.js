import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import Race from '../models/Race.js';
import Driver from '../models/Driver.js';
import Team from '../models/Team.js';

const URL = process.env.BACK_URL || 'http://localhost:3000/';


export const getAllRaces = async (req, res) => {
  try {
    const races = await Race.find();
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getTimezones = async (req, res) => {
  try {
    const races = await Race.find();
    const timezones = [];
    races.forEach(race => {
      timezones.push(race.timeZone);
    });
    res.json(timezones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getRaceById = async (req, res) => {
  const { raceId } = req.params;
  
  try {
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Carrera no encontrada' });
    }
    res.json(race);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la carrera' });
  }
}

export const getCircuitById = async (req, res) => {
  const { circuitId } = req.params;

  try {
    const race = await Race.find({ "circuit": circuitId });
    if (!race) {
      return res.status(404).json({ error: 'Carrera no encontrada' });
    }
    res.json(race);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la carrera' });
  }
}

export const getFinishedRaces = async (req, res) => {
  try {
    const races = await Race.find({ finished: true }).sort({ date: 1 });
    res.json(races);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las carreras' });
  }
}

export const getFinishedRaceById = async (req, res) => {
  const raceId = req.params.id;
  try {
    const race = await Race.find({ finished: true, _id: raceId }).sort({ date: 1 });
    res.json(race);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la carrera con id ',raceId });
  }
}

export const getUpcomingRaces = async (req, res) => {
  try {
    const now = new Date();

    const races = await Race.find({}).sort({ date: 1 });

    const upcomingRaces = races.filter(race => {
      return race.sessions.some(session => {
        const sessionDate = new Date(`${session.date}T${session.start_time}`);
        return sessionDate > now;
      });
    });

    res.json(upcomingRaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los próximos GPs' });
  }
}

export const getScheduleCircuitInfo = async (req, res) => {
  try {
    const data = await Race.aggregate([
      {
        $lookup: {
          from: 'circuit',
          localField: 'circuit',
          foreignField: '_id',
          as: 'circuit_info'
        }
      },
      {
        $unwind: '$circuit_info'
      },
      {
        $project: {
          name: 1,
          date: 1,
          finished: 1,
          round: 1,
          'circuit_info.id': '$circuit',
          'circuit_info.country.name': 1,
          'circuit_info.country.flag': 1,
          'circuit_info.map.track.black': 1
        }
      }
    ]);

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener carreras con información de circuitos' });
  }
};

export const updateSesionsByRound = async (req, res) => {
  const { year, round } = req.params;
  const baseUrl = `${URL}api/scripts`;

  try {
    // 0) Primero, lanza la generación de los JSON
    await axios.get(`${baseUrl}/process_sessions/${year}/${round}`);

    // 1) Recupera la carrera
    const raceDoc = await Race.findOne({ round: parseInt(round, 10) });
    if (!raceDoc) {
      return res.status(404).json({ message: 'Carrera no encontrada' });
    }

    // 2) Define la ruta y los ficheros a procesar
    const folderPath = path.join(process.cwd(), 'gp_results', year, round);
    const sprintGPs  = [2,6,13,19,21,23];
    const isSprint   = sprintGPs.includes(+round);
    const sessionFiles = isSprint
      ? [
          { file: 'practice_fp1.json',             name: 'Practice 1' },
          { file: 'practice_sprint qualifying.json', name: 'Sprint Qualifying' },
          { file: 'practice_sprint.json',           name: 'Sprint' }
        ]
      : [
          { file: 'practice_fp1.json', name: 'Practice 1' },
          { file: 'practice_fp2.json', name: 'Practice 2' },
          { file: 'practice_fp3.json', name: 'Practice 3' }
        ];

    // 3) Para cada sesión, lee el JSON y vuelca el objeto ordinal en session_result
    for (const { file, name } of sessionFiles) {
      const fullPath = path.join(folderPath, file);
      try {
        const raw  = await fs.readFile(fullPath, 'utf8');
        const data = JSON.parse(raw);

        // data.results ya es un objeto { first: {...}, second: {...}, ... }
        const sessionResultObj = data.results;

        // Volcarlo directamente en MongoDB
        await Race.collection.updateOne(
          { _id: raceDoc._id, 'sessions.name': name },
          { $set: { 'sessions.$.session_result': sessionResultObj } }
        );
      } catch (err) {
        console.warn(`Error al procesar ${file}: ${err.message}`);
      }
    }

    // 4) Devuelve la carrera ya actualizada
    const updated = await Race.findById(raceDoc._id);
    return res.status(200).json({
      message: 'Sesiones actualizadas preservando el objeto ordinal',
      race: updated
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar los resultados de práctica' });
  }
};

export const updateQualyfingByRound = async (req, res) => {
  const { year, round } = req.params;
  const baseUrl = `${URL}api/scripts`;

  try {
    // 1) Ejecutar el script que genera el archivo JSON de qualy
    try {
      await axios.get(`${baseUrl}/updateQualy/${year}/${round}`);
      /* console.log("Script ejecutado correctamente"); */
    } catch (axiosErr) {
      console.error("Fallo al ejecutar script de qualifying:");
      console.error("Status:", axiosErr.response?.status);
      console.error("Data:", axiosErr.response?.data);
      console.error("Mensaje:", axiosErr.message);

      return res.status(500).json({
        error: 'Fallo al ejecutar script de qualifying',
        details: axiosErr.response?.data || axiosErr.message,
      });
    }

    // 2) Buscar el documento de la carrera en MongoDB
    const raceDoc = await Race.findOne({ round: parseInt(round, 10) });
    if (!raceDoc) return res.status(404).json({ message: 'Carrera no encontrada' });

    // 3) Leer el archivo qualifying.json generado
    const folderPath = path.join(process.cwd(), 'gp_results', year, round);
    const fullPath = path.join(folderPath, 'qualifying.json');
    const raw = await fs.readFile(fullPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data.results || typeof data.results !== 'object') return res.status(400).json({ message: 'El archivo de clasificación no contiene resultados válidos' });

    const sessionResultObj = data.results;

    // 4) Guardar los resultados en la sesión "Qualifying"
    await Race.collection.updateOne(
      { _id: raceDoc._id, 'sessions.name': 'Qualifying' },
      { $set: { 'sessions.$.session_result': sessionResultObj } }
    );

    // 5) Devolver la carrera ya actualizada
    const updatedRace = await Race.findById(raceDoc._id);
    return res.status(200).json({
      message: 'Clasificación actualizada correctamente desde archivo JSON',
      race: updatedRace
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar los resultados de clasificación' });
  }
};

export const updateRaceByRound = async (req, res) => {
    const { year, round } = req.params;
  const baseUrl = `${URL}/api/scripts`;

  try {
    // 1) Ejecutar el script que genera el archivo JSON de qualy
    try {
      await axios.get(`${baseUrl}/updateRace/${year}/${round}`);
      /* console.log("Script ejecutado correctamente"); */
    } catch (axiosErr) {
      console.error("Fallo al ejecutar script de qualifying:");
      console.error("Status:", axiosErr.response?.status);
      console.error("Data:", axiosErr.response?.data);
      console.error("Mensaje:", axiosErr.message);

      return res.status(500).json({
        error: 'Fallo al ejecutar script de qualifying',
        details: axiosErr.response?.data || axiosErr.message,
      });
    }

    // 2) Buscar el documento de la carrera en MongoDB
    const raceDoc = await Race.findOne({ round: parseInt(round, 10) });
    if (!raceDoc) return res.status(404).json({ message: 'Carrera no encontrada' });

    // 3) Leer el archivo qualifying.json generado
    const folderPath = path.join(process.cwd(), 'gp_results', year, round);
    const fullPath = path.join(folderPath, 'race.json');
    const raw = await fs.readFile(fullPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data.results || typeof data.results !== 'object') return res.status(400).json({ message: 'El archivo de carrera no contiene resultados válidos' });

    const sessionResultObj = data.results;
    const winnerId = sessionResultObj.first?.driver;

    if (!winnerId) {
      return res.status(400).json({
        message: 'No se pudo determinar el ganador de la carrera (falta "first.driver" en session_result)'
      });
    }

    const raceResultsArray = Object.values(sessionResultObj)
      .filter(r => typeof r === 'object' && r.driver && r.position?.Position)
      .map(r => ({
        driver: r.driver,
        time: r.time ?? null,
        position: parseInt(r.position.Position)
      }))
      .sort((a, b) => a.position - b.position);


    // 4) Guardar los resultados en la sesión "Race"
    await Race.collection.updateOne(
      { _id: raceDoc._id, 'sessions.name': 'Race' },
      { 
        $set: {
          'sessions.$.session_result': sessionResultObj,
          race_results: raceResultsArray,
          finished: true,
          winner: winnerId
        } 
      }
    );

    // 5) Actualizar estadísticas de pilotos y acumular puntos por equipo
    const teamPointsMap = {};

    await Promise.all(
      Object.values(sessionResultObj).map(async result => {
        if (!result.driver || typeof result.points !== 'number') return null;

        const driverId = result.driver;
        const pointsToAdd = result.points;
        const position = parseInt(result.position?.Position);
        
        const driver = await Driver.findById(`driver_${driverId}`);
        if (!driver || !driver.team) {
          console.warn(`Piloto ${driverId} no encontrado o sin equipo.`);
          return null;
        }

        // Acumular puntos del equipo
        if (!teamPointsMap[driver.team]) {
          teamPointsMap[driver.team] = 0;
        }
        teamPointsMap[driver.team] += pointsToAdd;

        const updates = {
          $inc: {
            'stats.total_points': pointsToAdd,
            'stats.season_points': pointsToAdd,
            'stats.gp_entered': 1
          }
        };

        if (position === 1) {
          updates.$inc['stats.victories'] = 1;
          updates.$inc['stats.podiums'] = 1;
        } else if (position === 2 || position === 3) {
          updates.$inc['stats.podiums'] = 1;
        }

        try {
          await Driver.updateOne({ _id: `driver_${driverId}` }, updates);
        } catch (err) {
          console.warn(`Error actualizando stats para el piloto ${driverId}:`, err.message);
        }
      })
    );

    // 6) Actualizar puntos de los equipos
    await Promise.all(
      Object.entries(teamPointsMap).map(async ([teamId, points]) => {
        try {
          await Team.updateOne({ _id: `team_${teamId}` }, { $inc: { points } });
        } catch (err) {
          console.warn(`Error actualizando puntos para el equipo ${teamId}:`, err.message);
        }
      })
    );

    // 7) Devolver la carrera ya actualizada
    const updatedRace = await Race.findById(raceDoc._id);
    return res.status(200).json({
      message: 'Carrera actualizada correctamente desde archivo JSON',
      race: updatedRace
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar los resultados de carrera' });
  }
}