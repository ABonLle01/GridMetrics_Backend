import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import router from './routes/index.js';
import { scheduleDynamicJobs } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const state = PORT === 5000 ? 'Desarrollo' : 'Producción';

app.use(cors({
  origin: ['http://localhost:5173', 'https://gridmetrics-frontend.onrender.com'],
}));

app.use(express.json());
app.use('/api', router);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB conectado');
    scheduleDynamicJobs()
      .then(() => console.log('Tareas programadas con éxito'))
      .catch(err => console.error('Error al programar tareas:', err));
    app.listen(PORT, () => console.log(`Estado del Servidor: en ${state}`));
  })
  .catch(err => console.error('Error de conexión a MongoDB:', err));
