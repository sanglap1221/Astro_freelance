"""
Print all planetary positions using project's calculate_chart.
"""
import sys
from datetime import date, time
sys.path.insert(0, "d:/My Projects/Astro_FreeLance/backend")
from app.astrology.calculations import calculate_chart

if __name__ == '__main__':
    dob = date(1994, 10, 9)
    birth_time = time(6, 0)
    place = 'kolkata'

    res = calculate_chart(dob, birth_time, place, ayanamsa_mode='lahiri', true_moon=True)

    print('Planetary positions for', dob, birth_time, place)
    for p in res.planets:
        print("{}: sign_index={} sign={} lon={:.6f} deg_in_sign={:.6f} {}' {}\"".format(
            p.name, p.sign_index, p.sign, p.longitude, p.degree_in_sign, p.minutes_in_sign, p.seconds_in_sign
        ))
    # Ketu is appended as separate PlanetResult with name 'Ketu'
    # Also print ayanamsa and ascendant
    print('\nAyanamsa:', res.ayanamsa)
    print('Ascendant:', res.lagna_sign, res.ascendant_longitude)
