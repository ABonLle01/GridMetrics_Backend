import deepl

def translate_with_deepl(text, target_lang="ES", auth_key="3d0b5e5a-bd55-4b5d-90a8-75c4eccd6356:fx"):
    translator = deepl.Translator(auth_key)
    result = translator.translate_text(text, target_lang=target_lang)
    return result.text

