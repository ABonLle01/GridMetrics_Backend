import os
import fastf1
from fastf1.core import DataNotLoadedError
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timedelta
import json

load_dotenv()
mongo_uri = os.getenv("MONGO_URI")

with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# --- Configuración de Caché ---
cache_dir = os.path.join(os.getcwd(), 'fastf1_cache')  # Ruta absoluta
os.makedirs(cache_dir, exist_ok=True)  # Crear carpeta si no existe
fastf1.Cache.enable_cache(cache_dir)  # Habilitar caché

client = MongoClient(mongo_uri)  # Conectar a MongoDB
db = client.gridmetrics  # Nombre de la base de datos

# Función auxiliar para formatear timedelta al formato mm:ss:fff
def format_total_time(td: timedelta) -> str:
    total_seconds = td.total_seconds()
    total_minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int(round((total_seconds - total_minutes * 60 - seconds) * 1000))
    
    hours = total_minutes // 60
    minutes = total_minutes % 60
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}:{milliseconds:03d}"
    else:
        return f"{minutes:02d}:{seconds:02d}:{milliseconds:03d}"

def load_race_session(event, gp_round):
    try:
        race_session = event.get_session("Race")
        race_session.load(laps=True)
    except Exception as e:
        print(f"Error al cargar la sesión Race: {e}")
        return None

    # Verificar si realmente hay datos cargados envolviendo cada acceso en try/except
    has_data = False
    try:
        if race_session.laps is not None and not race_session.laps.empty:
            has_data = True
    except DataNotLoadedError as e:
        print(f"Error al acceder a laps: {e}")
    except Exception as e:
        print(f"Ocurrió un error al acceder a laps: {e}")

    try:
        if hasattr(race_session, "results") and race_session.results is not None and not race_session.results.empty:
            has_data = True
    except DataNotLoadedError as e:
        print(f"Error al acceder a results: {e}")
    except Exception as e:
        print(f"Ocurrió un error al acceder a results: {e}")

    try:
        # Intentamos acceder a total_laps para disparar el error si no se han cargado
        _ = race_session.total_laps
        has_data = True
    except DataNotLoadedError as e:
        print(f"Error al acceder a total_laps: {e}")
    except Exception as e:
        print(f"Ocurrió un error al acceder a total_laps: {e}")

    if not has_data:
        print(f"\nNo hay datos reales para el GP {gp_round} aún.\n")
        return None

    print("\n--------------------\nCarrera cargada con éxito!\n--------------------\n")
    return race_session

def get_fallback_data(year, gp_round):
    schedule = fastf1.get_event_schedule(year)
    schedule_event = schedule[schedule["RoundNumber"] == gp_round]
    if schedule_event.empty:
        print(f"No se encontró el GP para la ronda {gp_round} en el calendario.")
        return None
    schedule_event = schedule_event.iloc[0]
    
    # Formatear la fecha del evento principal (EventDate)
    fallback_date = pd.to_datetime(schedule_event["EventDate"]).date().strftime("%Y-%m-%d")
    fallback_official_name = schedule_event["OfficialEventName"]
    fallback_event_name = schedule_event["EventName"]
    fallback_location = schedule_event["Location"]
    fallback_country = schedule_event["Country"]
    fallback_event_format = schedule_event["EventFormat"]
    
    # Extraer las sesiones del evento: Se asume que hay hasta 5 sesiones, según la estructura del calendario.
    sessions = []
    for i in range(1, 6):  
        session_key = f"Session{i}"
        session_date_key = f"Session{i}Date"
        session_dateutc_key = f"Session{i}DateUtc"
        
        session_name = schedule_event.get(session_key)
        session_date = schedule_event.get(session_date_key)
        session_date_utc = schedule_event.get(session_dateutc_key)
        
        # Si la sesión está definida (no es un valor vacío o nulo), se agrega a la lista.
        if session_name and pd.notnull(session_name):
            # Se formatea la fecha si es posible.
            if hasattr(session_date, "strftime"):
                session_date_str = session_date.strftime("%Y-%m-%d %H:%M:%S")
            else:
                session_date_str = str(session_date)
            if hasattr(session_date_utc, "strftime"):
                session_date_utc_str = session_date_utc.strftime("%Y-%m-%d %H:%M:%S")
            else:
                session_date_utc_str = str(session_date_utc)
                
            sessions.append({
                "name": session_name,
                "date_local": session_date_str,
                "date_utc": session_date_utc_str
            })
    
    return {
        "date": fallback_date,
        "official_name": fallback_official_name,
        "name": fallback_event_name,
        "location": fallback_location,
        "country": fallback_country,
        "format": fallback_event_format,
        "sessions": sessions
    }

def build_circuit_data(event, fallback_data, race_session, data):
    # Usamos datos del evento si hay sesión válida; si no, usamos los fallback
    if race_session is not None:
        number_of_laps = None
        try:
            number_of_laps = race_session.total_laps
        except Exception as e:
            print(f"Error al obtener total_laps: {e}")
        try:
            fastest_lap = race_session.laps.pick_fastest()
        except Exception as e:
            print(f"No se pudo obtener la vuelta más rápida: {e}")
            fastest_lap = pd.DataFrame()
        event_name = event.EventName
        official_event_name = event.OfficialEventName
        country_name = event.Country
        location_key = event.Location
    else:
        number_of_laps = None
        fastest_lap = pd.DataFrame()
        event_name = fallback_data["name"]
        official_event_name = fallback_data["official_name"]
        country_name = fallback_data["country"]
        location_key = fallback_data["location"]
    
    circuit_data = {
        "_id": f"circuit_{location_key}",
        "name": event_name,
        "official_name": official_event_name,
        "country": {
            "name": country_name,
            "flag": data["gp"][location_key]["country_flag"] if location_key in data["gp"] else None
        },
        "first_gp": "2004-04-04",  # Valor fijo o por definir
        "map": {
            "track": {
                "black": data["gp"][location_key]["track"]["black"] if location_key in data["gp"] else None,
                "white": data["gp"][location_key]["track"]["white"] if location_key in data["gp"] else None
            },
            "circuit": data["gp"][location_key]["circuit"] if location_key in data["gp"] else None
        },
        "number_of_laps": number_of_laps,
        "length": None,
        "race_distance": None,
        "lap_record": {
            "time": format_total_time(fastest_lap['LapTime']) if not fastest_lap.empty else "N/A",
            "driver": fastest_lap['DriverNumber'] if not fastest_lap.empty else "N/A",
            "year": event.year if hasattr(event, "year") else None
        } if not fastest_lap.empty else {"time": "N/A", "driver": "N/A", "year": event.year if hasattr(event, "year") else None}
    }
    return circuit_data

def build_race_data(event, fallback_data, race_session, circuit_data):
    # Extraemos el id de la sesión de carrera de la ubicación
    location_key = event.Location if race_session is not None else fallback_data["location"]
    event_name = event.EventName if race_session is not None else fallback_data["name"]
    
    race_data = {
        "_id": f"gp_{event.year}_{location_key}",
        "name": event_name,
        "circuit": circuit_data["_id"],
        "date": (event.EventDate.strftime("%Y-%m-%d") if race_session is not None 
                 else fallback_data["date"]),
        "finished": True if race_session is not None else False,
        "winner": (race_session.results["DriverId"].iloc[0] 
                   if (race_session is not None and not race_session.results.empty) 
                   else None),
        "sessions": [],
        "race_results": []
    }
    
    # Si hay una sesión válida, procesamos cada sesión
    if race_session is not None:
        if event.EventFormat.lower() == "sprint_qualifying":
            session_names = ["Practice 1", "Sprint Qualifying", "Sprint", "Qualifying", "Race"]
        else:
            session_names = ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Race"]

        for name in session_names:
            try:
                s = event.get_session(name)
                s.load()
                
                start_time_obj = s.date
                end_time_obj = (s.date + s.session_duration) if hasattr(s, "session_duration") and s.session_duration else s.date + timedelta(hours=1)

                session_info = {
                    "name": s.name if s.name != "Race" else "Race",
                    "date": s.date.strftime("%Y-%m-%d"),
                    "start_time": start_time_obj.strftime("%H:%M:%S"),
                    "end_time": end_time_obj.strftime("%H:%M:%S"),
                    "session_result": {}
                }
                
                session_results = []
                if s.results is not None and not s.results.empty:
                    for i, (_, driver) in enumerate(s.results.iterrows(), start=1):
                        pos_value = driver.get('Position')
                        if pd.isna(pos_value):
                            pos_value = i
                        else:
                            pos_value = int(pos_value)
                        
                        t = driver.get('Time')
                        total_time_str = format_total_time(t) if pd.notna(t) else None
                        
                        session_results.append({
                            "driver": driver.get('DriverId', None),
                            "position": pos_value,
                            "total_time": total_time_str
                        })
                    
                    top_3 = sorted(session_results, key=lambda d: d["position"])[:3]
                    session_info["session_result"] = {
                        "first": top_3[0],
                        "second": top_3[1],
                        "third": top_3[2]
                    } if len(top_3) == 3 else session_results
                else:
                    session_info["session_result"] = {}
                
                race_data["sessions"].append(session_info)
                
                if name == "Race":
                    race_data["race_results"] = session_results
                    
            except Exception as e:
                print(f"Error al procesar la sesión '{name}': {e}")
                continue
    else:
        # Si no hay datos de sesión, guardamos una sesión mínima
        for fallback_session in fallback_data.get("sessions", []):
            date_str = fallback_session["date_local"]
            
            # Extraer start_time de la fecha con hora
            if " " in date_str:
                start_time_str = date_str.split(" ")[1]
                start_time_obj = datetime.strptime(start_time_str, "%H:%M:%S")
                end_time_obj = start_time_obj + timedelta(hours=1)
                end_time_str = end_time_obj.strftime("%H:%M:%S")
            else:
                start_time_str = None
                end_time_str = None

            race_data["sessions"].append({
                "name": fallback_session["name"],
                "date": date_str.split(" ")[0],  # Solo el día
                "start_time": start_time_str,
                "end_time": end_time_str,
                "session_result": {}
            })
    
    return race_data

def fetch_and_save_gp(year: int, gp_round):
    try:
        event = fastf1.get_event(2025, gp_round)
    except Exception as e:
        print(f"Error al obtener el evento para la ronda {gp_round}: {e}")
        return

    # Intenta cargar la sesión "Race" y valida si tiene datos reales
    race_session = load_race_session(event, gp_round)
    fallback_data = get_fallback_data(year, gp_round)
    if fallback_data is None:
        return

    # Procesa la información del circuito
    circuit_data = build_circuit_data(event, fallback_data, race_session, data)
    db.circuit.update_one({"_id": circuit_data["_id"]}, {"$set": circuit_data}, upsert=True)
    
    # Procesa la información de la carrera
    race_data = build_race_data(event, fallback_data, race_session, circuit_data)
    db.races.update_one({"_id": race_data["_id"]}, {"$set": race_data}, upsert=True)

    print(f"\n\nDatos del GP {race_data['name']} ({year}) actualizados en MongoDB!\n\n")
