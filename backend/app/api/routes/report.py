from fastapi import APIRouter, HTTPException

from app.astrology.calculations import (
    ZODIAC_SIGNS_BN,
    calculate_chart,
    format_sign_compact_bn,
    format_sign_dms_bn,
)
from app.schemas import ChartRequest, ChartResponse, PlanetPosition

router = APIRouter(prefix="/api", tags=["reports"])

PLANET_DISPLAY_ORDER = ["Moon", "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Rahu", "Ketu"]


@router.post("/generate-chart", response_model=ChartResponse)
def generate_chart(payload: ChartRequest) -> ChartResponse:
    try:
        chart = calculate_chart(
            payload.dob,
            payload.time,
            payload.place,
            ayanamsa_mode=payload.ayanamsa_mode,
            true_moon=payload.true_moon,
            true_node=payload.true_node,
            planet_overrides=payload.planet_overrides,
            override_moon_longitude=payload.override_moon_longitude,
            override_ascendant_longitude=payload.override_ascendant_longitude,
            latitude=payload.latitude,
            longitude=payload.longitude,
            timezone=payload.timezone,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    def to_bengali_digits(value: str) -> str:
        digits = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
        return str(value).translate(digits)

    return ChartResponse(
        name=payload.name,
        dob=payload.dob,
        time=payload.time,
        place=payload.place,
        julian_day=chart.julian_day,
        ayanamsa=chart.ayanamsa,
        ascendant=chart.ascendant_longitude,
        rashi=chart.rashi_sign,
        ascendant_bn=format_sign_dms_bn(chart.ascendant_longitude),
        ascendant_compact_bn=format_sign_compact_bn(chart.ascendant_longitude),
        rashi_bn=ZODIAC_SIGNS_BN[chart.rashi_sign_index],
        houses=[float((chart.lagna_sign_index + index) * 30.0 % 360.0) for index in range(12)],
        planets=[
            PlanetPosition(
                name=planet.name,
                longitude=planet.longitude,
                sign=planet.sign,
                degree_in_sign=planet.degree_in_sign,
                sign_bn=ZODIAC_SIGNS_BN[planet.sign_index],
                degree_dms=f"{int(planet.degree_in_sign)}° {planet.minutes_in_sign:02d}′ {planet.seconds_in_sign:02d}″",
                degree_dms_bn=(
                    f"{to_bengali_digits(f'{int(planet.degree_in_sign):02d}')}° "
                    f"{to_bengali_digits(f'{planet.minutes_in_sign:02d}')}′ "
                    f"{to_bengali_digits(f'{planet.seconds_in_sign:02d}')}″"
                ),
                display_bn=format_sign_dms_bn(planet.longitude),
                display_compact_bn=format_sign_compact_bn(planet.longitude),
                is_retrograde=planet.is_retrograde,
                is_combust=planet.is_combust,
            )
            for planet in sorted(
                chart.planets,
                key=lambda planet: PLANET_DISPLAY_ORDER.index(planet.name) if planet.name in PLANET_DISPLAY_ORDER else 99,
            )
        ],
    )
