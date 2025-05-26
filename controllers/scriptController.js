import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const process_sessions = (req, res) => {
  const { year, round } = req.params;
  const scriptPath = path.join(__dirname, '..', 'python_scripts', 'get_sessions.py');
  const pythonPath = path.join(__dirname, '..', 'python_scripts', '.venv', 'Scripts', 'python.exe');

  const pythonProcess = spawn(
    pythonPath,
    [scriptPath, year, round]
  );

  let output = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });  

  let responded = false;

  pythonProcess.on('close', (code) => {
    if (responded) return;
    responded = true;

    if (code === 0) {
      res.status(200).json({ success: true, output });
    } else {
      res.status(500).json({ success: false, error });
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Failed to start subprocess.', err);
    res.status(500).json({ success: false, error: err.message });
  });  

};

export const get_qualifying = async (req, res) => {
  const { year, round } = req.params;

  const scriptPath = path.join(__dirname, '..', 'python_scripts', 'get_qualifying_main.py');
  const pythonPath = path.join(__dirname, '..', 'python_scripts', '.venv', 'Scripts', 'python.exe');

  const py = spawn(pythonPath, [scriptPath, year, round]);

  let result = '';
  let error = '';

  py.stdout.on('data', (data) => {
    result += data.toString();
  });

  py.stderr.on('data', (data) => {
    error += data.toString();
  });

  py.on('close', async (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: 'Fallo al ejecutar script de qualifying',
        details: { code, stderr: error }
      });
    }

    const filePath = path.join(process.cwd(), 'gp_results', year, round, 'qualifying.json');

    try {
      const jsonContent = await fs.readFile(filePath, 'utf-8');
      return res.status(200).json(JSON.parse(jsonContent));
    } catch (err) {
      console.error('Error leyendo archivo JSON:', err);
      return res.status(500).json({ error: 'No se pudo leer el archivo de resultados' });
    }
  });
};

export const get_race = async (req, res) => {
  const { year, round } = req.params;

  const scriptPath = path.join(__dirname, '..', 'python_scripts', 'get_race_main.py');
  const pythonPath = path.join(__dirname, '..', 'python_scripts', '.venv', 'Scripts', 'python.exe');

  const py = spawn(pythonPath, [scriptPath, year, round]);

  let result = '';
  let error = '';

  py.stdout.on('data', (data) => {
    result += data.toString();
  });

  py.stderr.on('data', (data) => {
    error += data.toString();
  });

  py.on('close', async (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: 'Fallo al ejecutar script de race',
        details: { code, stderr: error }
      });
    }

    const filePath = path.join(process.cwd(), 'gp_results', year, round, 'race.json');

    try {
      const jsonContent = await fs.readFile(filePath, 'utf-8');
      return res.status(200).json(JSON.parse(jsonContent));
    } catch (err) {
      console.error('Error leyendo archivo JSON:', err);
      return res.status(500).json({ error: 'No se pudo leer el archivo de resultados' });
    }
  });
};