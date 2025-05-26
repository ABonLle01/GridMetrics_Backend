import deepl

def translate_with_deepl(text, target_lang="ES", auth_key="3d0b5e5a-bd55-4b5d-90a8-75c4eccd6356:fx"):
    translator = deepl.Translator(auth_key)
    result = translator.translate_text(text, target_lang=target_lang)
    return result.text

def update_circuit_document(db, circuit_id, first_gp=None, number_of_laps=None, length=None, race_distance=None, lap_record=None, questions=None):
    """
    Actualiza campos específicos de un documento en la colección 'circuit'.

    Parámetros:
      db: Conexión a la base de datos MongoDB.
      circuit_id: El _id del circuito sin prefijo.
      first_gp: Fecha del primer GP (YYYY-MM-DD).
      number_of_laps: Vueltas totales.
      length: Longitud del circuito (km).
      race_distance: Distancia total de carrera (km).
      questions: Diccionario con preguntas (en inglés, se traducen a español).
      lap_record: Diccionario con 'time', 'driver', 'year'.
    
    Retorna:
      matched_count, modified_count
    """
    collection = db["circuit"]
    document_id = f"circuit_{circuit_id}"

    update_fields = {}

    if first_gp is not None:
        update_fields["first_gp"] = first_gp
    if number_of_laps is not None:
        update_fields["number_of_laps"] = number_of_laps
    if length is not None:
        update_fields["length"] = length
    if race_distance is not None:
        update_fields["race_distance"] = race_distance

    if lap_record is not None:
        required_keys = {"time", "driver", "year"}
        if all(k in lap_record for k in required_keys):
            update_fields["lap_record"] = {
                "time": lap_record["time"],
                "driver": lap_record["driver"],
                "year": lap_record["year"]
            }
        else:
            print("El campo 'lap_record' debe contener 'time', 'driver' y 'year'.")


    if questions is not None:
        translated_questions = {}
        for key, text in questions.items():
            try:
                translated_text = translate_with_deepl(text)
                translated_questions[key] = translated_text
            except Exception as e:
                print(f"Error al traducir la pregunta {key}: {e}")
                translated_questions[key] = text
        update_fields["questions"] = translated_questions

    if not update_fields:
        print("No se proporcionaron campos para actualizar.")
        return 0, 0

    result = collection.update_one(
        {"_id": document_id},
        {"$set": update_fields}
    )

    print(f"Actualización completada. Documentos afectados: {result.matched_count}, modificados: {result.modified_count}")
    return result.matched_count, result.modified_count
