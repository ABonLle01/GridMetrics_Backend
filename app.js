import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import router from './routes/index.js';
import { scheduleDynamicJobs } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const URL = process.env.BACK_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use('/api', router);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB conectado');
    scheduleDynamicJobs();
    app.listen(PORT, () => console.log(`Servidor en ${URL}`));
  })
  .catch(err => console.error('Error de conexión a MongoDB:', err));
