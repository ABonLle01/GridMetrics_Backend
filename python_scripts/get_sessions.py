import sys
import io
from getPracticeResults import process_sessions

if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    if len(sys.argv) != 3:
        print("Uso: get_sessions.py <year> <round>")
        sys.exit(1)

    year = int(sys.argv[1])
    rnd = int(sys.argv[2])
    
    process_sessions(year, rnd)
    print(f"Sesiones del año {year}, ronda {rnd} procesadas correctamente.")
    sys.exit(0)