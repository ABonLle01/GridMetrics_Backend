import fastf1
import pandas as pd
import os
import json
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler

log_handler = RotatingFileHandler('updateQualy_processing.log', maxBytes=5*1024*1024, backupCount=3)
logging.basicConfig(
    handlers=[log_handler],
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def format_time(t):
    if pd.isna(t):
        return None
    total_seconds = t.total_seconds()
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:06.3f}"

def get_qualifying_results(year: int, round_number: int) -> dict:
    cache_dir = os.path.join(os.getcwd(), 'fastf1_cache')
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    output_dir = Path("gp_results")
    session_dir = output_dir / str(year) / str(round_number)
    session_dir.mkdir(parents=True, exist_ok=True)

    logging.info(f"Procesando clasificacion para {year} Ronda {round_number}")

    try:
        session = fastf1.get_session(year, round_number, 'Q')
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
        pos = int(row.Position)
        if pos > 20:
            continue
        result[ordinales[pos - 1]] = {
            "driver": row.DriverId.lower(),
            "position": pos,
            "total_time": {
                "Q1": format_time(row.Q1),
                "Q2": format_time(row.Q2),
                "Q3": format_time(row.Q3)
            }
        }

    full_data = {
        "session": session.name,
        "event": f"{year} {session.event['EventName']}",
        "results": result
    }

    output_file = session_dir / "qualifying.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(full_data, f, indent=4, ensure_ascii=False)

    logging.info(f"Archivo guardado correctamente en {output_file}")
    return {
        "message": "Clasificacion procesada correctamente",
        "file_path": str(output_file)
    }
