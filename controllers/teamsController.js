import Team from '../models/Team.js';
import Driver from '../models/Driver.js';
import Race from '../models/Race.js';

export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getTeamIds = async (req, res) => {
  try {
    const teams = await Team.find();
    let ids = [];
    teams.forEach(team => {
      ids.push(team._id);
    });
    res.json(ids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);

    if (!team) return res.status(404).json({ message: 'Equipo no encontrado' });

    res.json(team.name);
  } catch (error) {
    console.error('Error al obtener equipo:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export const getTeamStandings = async (req, res) => {
  try {
    const teams = await Team.find({});
    const summary = [];

    for (const team of teams) {
      const driversData = await Driver.find({
        _id: { $in: team.drivers }
      });

      const drivers = driversData.map(driver => ({
        id: driver._id,
        name: `${driver.name.first} ${driver.name.last}`,
        image: driver.profile_image
      }));

      summary.push({
        id: team._id,
        name: team.name,
        logo: team.logo,
        drivers,
        season_points: team.points ?? 0
      });
    }

    res.status(200).json(summary);
  } catch (error) {
    console.error('Error al obtener resumen de equipos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
}

export const updateTeamPointsById = async (req, res) => {
  const { id } = req.params;
  const { points } = req.body;

  if (points !== null && typeof points !== 'number') {
    return res.status(400).json({ message: 'La puntuación debe ser un número o null' });
  }

  try {
    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { points },
      { new: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ message: 'Equipo no encontrado' });
    }

    res.status(200).json(updatedTeam);
  } catch (error) {
    console.error('Error al actualizar los puntos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export const getEnrichedTeams = async (req, res) => {
  try {
    const teams = await Team.find();

    const enrichedTeams = await Promise.all(teams.map(async (team) => {
      const driverDetails = await Promise.all(team.drivers.map(async (driverId) => {
        try {
          const driver = await Driver.findById(driverId);
          return {
            firstName: driver.name.first,
            lastName: driver.name.last,
            profileImage: driver.profile_image,
            nationality: driver.nationality.country,
          };
        } catch (error) {
          throw new Error(`Error al buscar el piloto con la id ${driverId}`, error);
        }
      }));

      return {
        ...team.toObject(),
        drivers: driverDetails
      };
    }));

    res.status(200).json(enrichedTeams);
  } catch (error) {
    console.error('Error al obtener los equipos enriquecidos:', error);
    res.status(500).json({ message: 'Error al obtener los equipos' });
  }
};

export const getEnrichedTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) { return res.status(404).json({ message: 'Equipo no encontrado' }); }

    const driverDetails = await Promise.all(
      team.drivers.map(async (driverId) => {
        const driver = await Driver.findById(driverId);
        return {
          id: driver._id,
          firstName: driver.name.first,
          lastName: driver.name.last,
          profileImage: driver.profile_image,
          nationality: driver.nationality.country,
        };
      })
    );

    const enrichedTeam = {
      ...team.toObject(),
      drivers: driverDetails
    };

    res.status(200).json(enrichedTeam);
  } catch (error) {
    console.error('Error al obtener el equipo enriquecido:', error);
    res.status(500).json({ message: 'Error al obtener el equipo' });
  }
};

export const getTeamRaceResults = async (req, res) => {
  const { id } = req.params;
  let teamId = "";
  if (id.startsWith('team_')) {
    teamId = id;
  } else {
    teamId = `team_${id}`;
  }

  try {
    // Verifica que el equipo exista
    const team = await Team.findById(teamId).lean();
    if (!team) return res.status(404).json({ error: 'No se ha encontrado el equipo' });

    const teamDriverIds = team.drivers.map(driverId => driverId.replace(/^driver_/, ''));

    // Busca todas las carreras finalizadas
    const races = await Race.find({ finished: true }).lean();

    const results = races
      .map(race => {
        const raceSession = race.sessions.find(s => s.name === 'Race');
        if (!raceSession || !raceSession.session_result) return null;

        let teamPoints = 0;
        let teamDriversResults = [];

        for (const entry of Object.values(raceSession.session_result)) {
          const driverId = entry.driver;
          if (teamDriverIds.includes(driverId)) {
            // Normaliza posición y puntos
            const rawPos = entry.position;
            const position = typeof rawPos === 'object'
              ? rawPos.Position ?? rawPos.$numberInt
              : rawPos;
            const rawPoints = entry.points ?? entry.points?.$numberInt ?? 0;
            const points = Number(rawPoints);

            teamPoints += points;
            teamDriversResults.push({
              driverId,
              position: Number(position),
              points,
              status: entry.status
            });
          }
        }

        if (teamDriversResults.length === 0) return null;

        return {
          raceId: race._id,
          raceName: race.name,
          date: race.date,
          circuit: race.circuit,
          totalPoints: teamPoints,
          drivers: teamDriversResults
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({
      teamId: team._id,
      teamName: team.name,
      teamDrivers: team.drivers,
      results
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
