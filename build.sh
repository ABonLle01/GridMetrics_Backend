#!/usr/bin/env bash
# build.sh
echo "Instalando dependencias de Python..."
pip install -r requirements.txt

echo "Ejecutando scheduler.js..."
node scheduler.js