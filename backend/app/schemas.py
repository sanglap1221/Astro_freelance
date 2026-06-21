from datetime import date, time

from pydantic import BaseModel, Field


class ChartRequest(BaseModel):
    name: str = Field(min_length=1)
    dob: date
    time: time
    place: str = Field(min_length=1)
    ayanamsa_mode: str = "traditional"
    custom_ayanamsa_degrees: float | None = None
    true_moon: bool = True
    true_node: bool = True
    planet_overrides: dict[str, float] | None = None
    override_moon_longitude: float | None = None
    override_ascendant_longitude: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None


class PlanetPosition(BaseModel):
    name: str
    longitude: float
    sign: str
    degree_in_sign: float
    sign_bn: str
    degree_dms: str
    degree_dms_bn: str
    display_bn: str
    display_compact_bn: str
    is_retrograde: bool
    is_combust: bool


class ChartResponse(BaseModel):
    name: str
    dob: date
    time: time
    place: str
    julian_day: float
    ayanamsa: float
    ascendant: float
    rashi: str
    ascendant_bn: str
    ascendant_compact_bn: str
    rashi_bn: str
    houses: list[float]
    planets: list[PlanetPosition]


class PdfRequest(BaseModel):
    name: str = Field(min_length=1)
    father_name: str | None = None
    dob: date
    time: time
    place: str = Field(min_length=1)
    mobile: str | None = None
    language: str = "bn"
    # Engine settings hardcoded — NOT exposed to clients
    # TRUE_NODE = True, WORKFLOW = Traditional Bengali NC Lahiri
    planet_overrides: dict[str, float] | None = None
    override_moon_longitude: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None



class PdfResponse(BaseModel):
    pdf_url: str
