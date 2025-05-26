# GridMetrics Backend

Este es el backend del proyecto **GridMetrics**, una aplicación centrada en la recopilación, procesamiento y exposición de datos de Fórmula 1. Utiliza **Node.js**, **Express**, **MongoDB** y scripts en **Python** para extraer y mantener actualizada la información relevante de cada sesión de carrera.

---

## Características

- API RESTful construida con Express
- Conexión a base de datos MongoDB (Mongoose)
- Cronjobs automáticos mediante `node-schedule`
- Scripts en Python para procesamiento de datos con FastF1
- Manejo de logs para seguimiento de procesos
- Soporte para variables de entorno con `.env`

---

## Estructura del proyecto
>
    gridmetrics_backend
    ├── controllers/        (Controladores de rutas)
    ├── models/             (Modelos de Mongoose)
    ├── routes/             (Rutas de la API)
    ├── python_scripts/     (Scripts de análisis en Python) 
    │ ├── fastf1_cache/     (Carpeta de caché para la API FastF1)
    │ ├── gp_results/       (Carpeta en la que se guarda la informacion de cada sesión como .json)
    ├── scheduler.js        (Tareas automáticas programadas)  
    ├── app.js              (Punto de entrada principal del servidor) 
    ├── .env
    ├── .gitignore
    ├── package.json
    ├── requirements.txt    (Librerias de Python a instalar) 


---

## Instalación y uso

### Requisitos

- Node.js >= 18
- MongoDB Atlas o local
- Python >= 3.10

## Instalación

### Clona el repositorio
1. `git clone https://github.com/tu-usuario/gridmetrics_backend.git`
2. `cd gridmetrics_backend`

### Instala dependencias de Node.js
`npm install`

### Instala dependencias de Python
1. `cd python_scripts`
2. `python -m venv .venv`
3. `.venv/bin/activate` (en Windows)
4. `pip install -r requirements.txt`

## Variables de entorno

Crea un archivo `.env` en la raíz con las siguientes claves:

+ **PORT**=_port_number_ (se puede dejar vacío, en ese caso se utilizará el puerto 5000)
+ **MONGO_URI**=_mongodb+srv://"user":"pass"@cluster.mongodb.net/dbname_

## Ejecución
Desarrollo (con nodemon): `npm run dev`

Producción: `npm start`

## Tareas programadas
El archivo `scheduler.js` programa automáticamente actualizaciones periódicas de sesiones, qualy y carreras. Se inicializa desde `app.js` al levantar el servidor.

