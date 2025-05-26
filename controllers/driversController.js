import Driver from '../models/Driver.js';
import Team from '../models/Team.js';
import Race from '../models/Race.js';

export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getAllIds = async (req, res) => {
  try {
    const drivers = await Driver.find();
    let ids = [];
    drivers.forEach(driver => {
      ids.push(driver._id);
    });
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getDriverStandings = async (req, res) => {
  try {
    const drivers = await Driver.find({}, {
      'name.first': 1,
      'name.last': 1,
      'profile_image': 1,
      'nationality.flag_image': 1,
      'team': 1,
      'stats.season_points': 1
    });

    const formattedDrivers = await Promise.all(drivers.map(async (driver) => {
      const teamId = `team_${driver.team}`;
      const team = await Team.findById(teamId);

      return {
        _id: driver._id,
        fullName: `${driver.name.first} ${driver.name.last}`,
        profileImage: driver.profile_image,
        flagImage: driver.nationality.flag_image,
        teamName: team.name,
        seasonPoints: driver.stats?.season_points ?? 0
      };
    }));

    res.status(200).json(formattedDrivers);
  } catch (error) {
    console.error('Error al obtener resumen de pilotos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export const updateSeasonPointsByDriverId = async (req, res) => {
  const { id } = req.params;
  const { season_points } = req.body;

  if (season_points !== null && typeof season_points !== 'number') {
    return res.status(400).json({ message: 'season_points debe ser un número o null' });
  }

  try {
    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { 'stats.season_points': season_points },
      { new: true }
    );

    if (!updatedDriver) {
      return res.status(404).json({ message: 'Piloto no encontrado' });
    }

    res.status(200).json(updatedDriver);
  } catch (error) {
    console.error('Error al actualizar season_points:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export const getEnrichedDrivers = async (req, res) => {
  try {
    const data = await Driver.aggregate([
      {
        $addFields: {
          teamId: {
            $concat: ['team_', '$team']
          }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team_data'
        }
      },
      {
        $unwind: '$team_data'
      },
      {
        $project: {
          'name.first': 1,
          'name.last': 1,
          car_number: 1,
          team: 1,
          nationality: 1,
          profile_image: 1,
          'season_points': '$stats.season_points',
          'team_data.name': 1,
          'team_data.team_color': 1
        }
      }
    ]);

    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener los pilotos enriquecidos:', error);
    res.status(500).json({ message: 'Error al obtener los pilotos' });
  }
};

export const getDriverData = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Driver.aggregate([
      {
        $match: { _id: id }
      },
      {
        $addFields: {
          teamId: {
            $concat: ['team_', '$team']
          }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team_data'
        }
      },
      {
        $unwind: '$team_data'
      },
      {
        $project: {
          'name.first': 1,
          'name.last': 1,
          'biography': 1,
          'birth': 1,
          'car_number': 1,
          'career': 1,
          'images': 1,
          'stats': 1,
          'nationality': 1,
          'profile_image': 1,
          'team': 1,
          'team_data._id':1,
          'team_data.name': 1,
          'team_data.team_color': 1,
          'team_data.logo': 1,
        }
      }
    ]);

    if (data.length === 0) {
      return res.status(404).json({ message: 'Piloto no encontrado' });
    }

    res.status(200).json(data[0]);
  } catch (error) {
    console.error('Error al obtener los datos del piloto:', error);
    res.status(500).json({ message: 'Error al obtener los datos del piloto' });
  }
};

export const getDriverRacesResults = async (req, res) => {
  const { id } = req.params;
  let driverId = "";
  if (id.startsWith('driver_')) { driverId = id.slice('driver_'.length); }

  try {
    // Verifica que el piloto exista
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ error: 'No se ha encontrado el piloto' });

    // Busca todas las carreras finalizadas
    const races = await Race.find({ finished: true }).lean();

    // Filtra y formatea resultados usando la sesión "Race"
    const results = races
      .map(race => {
        const raceSession = race.sessions.find(s => s.name === 'Race');
        if (!raceSession || !raceSession.session_result) return null;

        // Busca la entrada del piloto en session_result
        const entry = Object.values(raceSession.session_result)
          .find(e => e.driver === driverId);
        if (!entry) return null;

        // Extrae posición y puntos
        const rawPos = entry.position;
        const position = typeof rawPos === 'object'
          ? rawPos.Position ?? rawPos.$numberInt
          : rawPos;
        const points = entry.points ?? entry.points?.$numberInt ?? 0;

        return {
          raceId: race._id,
          raceName: race.name,
          date: race.date,
          circuit: race.circuit,
          position: Number(position),
          points: Number(points),
          status: entry.status
        };
      })
      .filter(Boolean) // elimina carreras donde no participó
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({
      driverId: driver._id,
      driverId_short: driverId,
      driverName: `${driver.name.first} ${driver.name.last}`,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
