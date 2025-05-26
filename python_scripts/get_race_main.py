import sys
from get_race_results import get_race_results

if __name__ == "__main__":
    year = int(sys.argv[1])
    round_number = int(sys.argv[2])
    get_race_results(year, round_number)
    print(f"Script ejecutado correctamente para {year}, ronda {round_number}")
    sys.exit(0)
