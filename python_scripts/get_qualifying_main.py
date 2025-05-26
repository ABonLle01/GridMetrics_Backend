import sys
from get_qualifying_results import get_qualifying_results

if __name__ == "__main__":
    year = int(sys.argv[1])
    round_number = int(sys.argv[2])

    get_qualifying_results(year, round_number)

    print(f"Script ejecutado correctamente para {year}, ronda {round_number}")
    sys.exit(0)
