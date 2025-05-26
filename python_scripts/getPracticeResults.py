import os
import pandas as pd
import json
from pathlib import Path
import fastf1
import logging
from logging.handlers import RotatingFileHandler

driver_id_dict = {
    'NOR': 'norris',
    'SAI': 'sainz',
    'LEC': 'leclerc',
    'PIA': 'piastri',
    'VER': 'max_verstappen',
    'ALB': 'albon',
    'RUS': 'russell',
    'ALO': 'alonso',
    'HAD': 'hadjar',
    'STR': 'stroll',
    'TSU': 'tsunoda',
    'HAM': 'hamilton',
    'DOO': 'doohan',
    'ANT': 'antonelli',
    'BOR': 'bortoleto',
    'LAW': 'lawson',
    'GAS': 'gasly',
    'HUL': 'hulkenberg',
    'OCO': 'ocon',
    'BEA': 'bearman',
    'HIR': 'hirakawa',
    'DRU': 'drugovich',
    'IWA': 'iwasa',
    'BRO': 'browning',
    'VES': 'vesti',
    'BEG': 'beganovich',
    'COL': 'colapinto'
}

def process_sessions(year, round):
    # Configuracion de logging con rotacion de archivos
    log_handler = RotatingFileHandler('getSessions_processing.log', maxBytes=5*1024*1024, backupCount=3)
    logging.basicConfig(
        handlers=[log_handler],
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )

    # Crear caché de FastF1
    cache_dir = os.path.join(os.getcwd(), 'fastf1_cache')
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    output_dir = Path("gp_results")
    session_dir = output_dir / f"{year}" / f"{round}"
    session_dir.mkdir(parents=True, exist_ok=True)

    # Archivo de estado
    status_file = session_dir / "status.json"
    if status_file.exists():
        with open(status_file, 'r', encoding='utf-8') as f:
            processed_status = json.load(f)
    else:
        processed_status = {}

    # Obtener evento de la temporada
    event = fastf1.get_event(year, round)
    has_sprint = (event["EventFormat"] == "sprint_qualifying")

    # Sesiones a procesar
    sessions_to_process = [('FP1', lambda: event.get_practice(1))]
    if has_sprint:
        sessions_to_process += [('Sprint Qualifying', event.get_sprint_qualifying), ('Sprint', event.get_sprint)]
    else:
        sessions_to_process += [('FP2', lambda: event.get_practice(2)), ('FP3', lambda: event.get_practice(3))]

    # Procesamiento de sesiones
    for session_name, session_loader in sessions_to_process:
        if processed_status.get(session_name):
            logging.info(f"Sesion {session_name} ya procesada, omitiendo...")
            continue

        try:
            logging.info(f"Iniciando procesamiento para la sesion: {session_name}")

            session = session_loader()
            session.load()

            if session_name in ['Sprint Qualifying', 'SQ', 'Q']:
                # Para sesiones de clasificacion, usar directamente los resultados oficiales
                logging.info(f"Usando datos oficiales de clasificacion para la sesion {session_name}")

                results = session.results.copy()
                results['FormattedTime'] = results['Time'].dt.total_seconds().apply(
                    lambda x: f"{int(x // 60)}:{x % 60:06.3f}" if pd.notna(x) else None
                )

                session_results = results[['Position', 'Abbreviation', 'FormattedTime', 'TeamName']].copy()
                session_results.rename(columns={
                    'Abbreviation': 'Driver',
                    'TeamName': 'Team'
                }, inplace=True)
                session_results['Compound'] = None  # No disponible en clasificacion

                session_results['Driver'] = session_results['Driver'].map(driver_id_dict)
            else:
                if session.laps.empty:
                    logging.info(f"Sesion {session_name} sin datos de vuelta, se omite.")
                    continue

                # Obtener las vueltas más rápidas
                fastest_laps = session.laps.groupby('Driver').apply(lambda x: x.pick_fastest())
                fastest_laps = fastest_laps.sort_values('LapTime')

                if fastest_laps['LapTime'].isna().all() or fastest_laps['LapTime'].empty:
                    logging.warning(f"Sesion {session_name} no contiene tiempos válidos. Se omite.")
                    continue

                fastest_laps['FormattedTime'] = fastest_laps['LapTime'].dt.total_seconds().apply(
                    lambda x: f"{int(x // 60)}:{x % 60:06.3f}"
                )
                fastest_laps['Position'] = range(1, len(fastest_laps) + 1)
                fastest_laps['Driver'] = fastest_laps['Driver'].map(driver_id_dict)
                session_results = fastest_laps[['Position', 'Driver', 'FormattedTime', 'Team', 'Compound']].copy()

            session_results.columns = [col.lower() for col in session_results.columns]
            records = session_results.to_dict(orient='records')

            ordinales = [
                'first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth',
                'thirteenth','fourteenth','fifteenth','sixteenth','seventeenth','eighteenth','nineteenth','twentieth'
            ]

            session_results_obj = {
                ordinales[i]: records[i]
                for i in range(len(records))
            }

            # Guardar resultados de la sesion en un archivo JSON
            session_dict = {
                'session': session_name,
                'event':   f'{event.year} {event.EventName}',
                'results': session_results_obj
            }

            filename = session_dir / f"practice_{session_name.lower()}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(session_dict, f, indent=4, ensure_ascii=False)

            # Actualizar el estado de la sesion
            processed_status[session_name] = True
            logging.info(f"Sesion {session_name} procesada y guardada en {filename}")

        except Exception as e:
            logging.error(f"Error procesando sesion {session_name}: {str(e)}")

    # Guardar el estado actualizado
    with open(status_file, 'w', encoding='utf-8') as f:
        json.dump(processed_status, f, indent=4, ensure_ascii=False)

