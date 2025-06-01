import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isWindows = process.platform === 'win32';

const getPythonPath = () => {
  return process.env.BACK_URL
    ? 'python3'
    : isWindows
      ? path.join(__dirname, 'python_scripts', '.venv', 'Scripts', 'python.exe')
      : path.join(__dirname, 'python_scripts', '.venv', 'bin', 'python3');
};

const runPythonScript = async (scriptFile, args = [], expectJson = false, jsonPath = '') => {
  const pythonPath = getPythonPath();
  const scriptPath = path.join(__dirname, '..', 'python_scripts', scriptFile);

  return new Promise((resolve, reject) => {
    const py = spawn(pythonPath, [scriptPath, ...args]);

    let result = '';
    let error = '';

    py.stdout.on('data', (data) => (result += data.toString()));
    py.stderr.on('data', (data) => (error += data.toString()));

    py.on('close', async (code) => {
      if (code !== 0) {
        return reject({ code, error });
      }

      if (expectJson) {
        try {
          const jsonContent = await fs.readFile(jsonPath, 'utf-8');
          return resolve(JSON.parse(jsonContent));
        } catch (readErr) {
          return reject({ code: 500, error: 'Error leyendo archivo JSON', details: readErr });
        }
      }

      resolve(result);
    });

    py.on('error', (err) => {
      reject({ code: 500, error: 'No se pudo ejecutar el script', details: err });
    });
  });
};


export const process_sessions = async (req, res) => {
  const { year, round } = req.params;

  try {
    const output = await runPythonScript('get_sessions.py', [year, round]);
    res.status(200).json({ success: true, output });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};


export const get_qualifying = async (req, res) => {
  const { year, round } = req.params;
  const jsonPath = path.join(__dirname, '..', 'gp_results', year, round, 'qualifying.json');


  try {
    const data = await runPythonScript('get_qualifying_main.py', [year, round], true, jsonPath);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fallo al obtener clasificación', details: err });
  }
};


export const get_race = async (req, res) => {
  const { year, round } = req.params;
  const jsonPath = path.join(__dirname, '..', 'gp_results', year, round, 'race.json');

  try {
    const data = await runPythonScript('get_race_main.py', [year, round], true, jsonPath);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Fallo al obtener carrera', details: err });
  }
};
