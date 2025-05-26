def save_driver(db, driver_id, driver_data, translate_bio=False):
    """
    Inserta o actualiza un documento de piloto en la colección 'drivers'.

    Parámetros:
      db: Conexión MongoDB.
      driver_id: ID único del piloto (por ejemplo 'max_verstappen').
      driver_data: Diccionario con los campos del piloto según el modelo.
      translate_bio: Si True, traduce la biografía.

    Retorna:
      matched_count, modified_count
    """
    collection = db["drivers"]
    document_id = f"driver_{driver_id}"

    if translate_bio and "biography" in driver_data:
        try:
            import deepl
            translator = deepl.Translator("3d0b5e5a-bd55-4b5d-90a8-75c4eccd6356:fx")
            translated_bio = translator.translate_text(driver_data["biography"], target_lang="ES")
            driver_data["biography"] = translated_bio.text
        except Exception as e:
            print(f"Error traduciendo la biografía: {e}")

    result = collection.update_one(
        {"_id": document_id},
        {"$set": driver_data},
        upsert=True
    )

    print(f"Piloto guardado. Coincidentes: {result.matched_count}, modificados: {result.modified_count}")
    return result.matched_count, result.modified_count
