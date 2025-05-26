def save_team(db, team_id, team_data):
    """
    Inserta o actualiza un documento de equipo en la colección 'teams'.

    Parámetros:
      db: Conexión MongoDB.
      team_id: ID único del equipo (por ejemplo 'red_bull').
      team_data: Diccionario con los campos del equipo según el modelo.

    Retorna:
      matched_count, modified_count
    """
    collection = db["teams"]
    document_id = f"team_{team_id}"

    result = collection.update_one(
        {"_id": document_id},
        {"$set": team_data},
        upsert=True
    )

    print(f"Equipo guardado. Coincidentes: {result.matched_count}, modificados: {result.modified_count}")
    return result.matched_count, result.modified_count