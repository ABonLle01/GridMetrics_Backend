import fastf1
import os
import pandas as pd
import json
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler

log_handler = RotatingFileHandler('updateRace_processing.log', maxBytes=5*1024*1024, backupCount=3)
logging.basicConfig(
    handlers=[log_handler],
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def formatear_duracion(tiempo):
    if isinstance(tiempo, pd.Timedelta):
        total_segundos = int(tiempo.total_seconds())
        milisegundos = int(tiempo.microseconds / 1000)
        horas = total_segundos // 3600
        minutos = (total_segundos % 3600) // 60
        segundos = total_segundos % 60
        return f"{horas:02}:{minutos:02}:{segundos:02}.{milisegundos:03}"
    return None

def get_race_results(year: int, round_number: int) -> dict:
    cache_dir = os.path.join(os.getcwd(), 'fastf1_cache')
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    output_dir = Path("gp_results")
    session_dir = output_dir / str(year) / str(round_number)
    session_dir.mkdir(parents=True, exist_ok=True)

    logging.info(f"Procesando carrera para {year} Ronda {round_number}")

    try:
        session = fastf1.get_session(year, round_number, 'R')
        session.load()
    except Exception as e:
        logging.error(f"Error cargando la sesión: {e}")
        return {"error": "Error al cargar la sesión"}

    if not hasattr(session, 'results'):
        logging.error("No se han encontrado resultados en la sesión.")
        return {"error": "No se encontraron resultados en la sesión"}

    df = session.results.sort_values(by="Position")

    ordinales = [
        'first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth',
        'thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'
    ]

    result = {}
    for row in df.itertuples():
        posicion = int(row.Position)
        if posicion > 20:
            continue
        result[ordinales[posicion - 1]] = {
            "driver": row.DriverId.lower(),
            "position": {
                "Position": row.Position,
                "ClassifiedPosition": row.ClassifiedPosition,
                "GridPosition": row.GridPosition
            },
            "status": row.Status,
            "time": formatear_duracion(row.Time),
            "points": row.Points
        }

    full_data = {
        "session": session.name,
        "event": f"{year} {session.event['EventName']}",
        "results": result
    }

    output_file = session_dir / "race.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(full_data, f, indent=4, ensure_ascii=False)

    logging.info(f"Archivo guardado correctamente en {output_file}")
    return {
        "message": "Clasificacion procesada correctamente",
        "file_path": str(output_file)
    }
