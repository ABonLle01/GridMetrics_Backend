import Circuit from '../models/Circuit.js';

export const getAllCircuits = async (req, res) => {
    try {
        const circuits = await Circuit.find();
        res.json(circuits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export const getCircuitById = async (req, res) => {
    const { circuitId } = req.params;
  
    try {
      const circuit = await Circuit.findById(circuitId);
      if (!circuit) {
        return res.status(404).json({ error: 'Circuito no encontrado' });
      }
      res.json(circuit);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener el circuito' });
    }
}