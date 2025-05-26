def delete_element_by_id(db, collection_name, element_id):
    """
    Borra un elemento de la base de datos usando su _id.
    
    Parámetros:
      db: La base de datos de PyMongo (p.ej., client.gridmetrics).
      collection_name: Nombre de la colección (p.ej., "circuit" o "races").
      element_id: El identificador base del elemento a borrar.
                 La función formará el _id completo según la colección.
    
    Retorna:
      deleted_count: Número de documentos borrados (generalmente 1 o 0).
    """
    collection = db[collection_name]

    # Se generan los _id para cada colección usando la convención actual.
    tables = {
        'circuit': f"circuit_{element_id}",
        'races': f"gp_2025_{element_id}"
    }

    if collection_name == "circuit": doc_id = tables.get("circuit") 
    elif collection_name == "races": doc_id = tables.get("races")
    else: raise ValueError("Revisa el nombre de la colección de la bbdd. Debe ser 'circuit' o 'races'.")

    result = collection.delete_one({"_id": doc_id})

    if result.deleted_count:
        print(f"Elemento con _id '{doc_id}' borrado correctamente.")
    else:
        print(f"No se encontró elemento con _id '{doc_id}' para borrar.")
    
    return result.deleted_count
