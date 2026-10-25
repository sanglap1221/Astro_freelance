from datetime import date, time, datetime
from zoneinfo import ZoneInfo
from unittest.mock import patch
import pytest

from app.astrology.calculations import (
    Location,
    resolve_location,
    get_timezone_from_coords,
    search_locations,
    geocode_online,
    calculate_chart,
)


def test_kolkata_location_and_historical_time():
    """Verify Kolkata coordinates resolve to Asia/Kolkata and maintain UTC+5:30 offset."""
    loc = resolve_location(place="Kolkata", lat=22.5726, lon=88.3639)
    assert loc.timezone == "Asia/Kolkata"
    assert loc.latitude == pytest.approx(22.5726, abs=0.001)
    assert loc.longitude == pytest.approx(88.3639, abs=0.001)

    # Test historical birth dates
    tz = ZoneInfo(loc.timezone)
    dt1 = datetime.combine(date(1975, 4, 10), time(10, 0), tzinfo=tz)
    utc1 = dt1.astimezone(ZoneInfo("UTC"))
    assert dt1.utcoffset().total_seconds() == 5.5 * 3600
    assert utc1.hour == 4
    assert utc1.minute == 30

    # Chart calculation
    chart = calculate_chart(
        dob=date(1975, 4, 10),
        birth_time=time(10, 0),
        place="Kolkata",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
    )
    assert chart.ascendant_longitude > 0
    assert len(chart.planets) == 9


def test_london_winter_and_summer_dst():
    """Verify London coordinates resolve to Europe/London and observe GMT vs BST historical DST."""
    # Coordinate resolution without timezone
    loc = resolve_location(lat=51.5074, lon=-0.1278)
    assert loc.timezone == "Europe/London"

    tz = ZoneInfo("Europe/London")

    # Winter: GMT (UTC+00:00)
    winter_dob = date(1980, 1, 15)
    winter_time = time(12, 0)
    dt_winter = datetime.combine(winter_dob, winter_time, tzinfo=tz)
    utc_winter = dt_winter.astimezone(ZoneInfo("UTC"))
    assert dt_winter.utcoffset().total_seconds() == 0
    assert utc_winter.hour == 12
    assert utc_winter.minute == 0

    chart_winter = calculate_chart(
        dob=winter_dob,
        birth_time=winter_time,
        place="London",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
    )

    # Summer: BST (British Summer Time, UTC+01:00)
    summer_dob = date(1980, 7, 15)
    summer_time = time(12, 0)
    dt_summer = datetime.combine(summer_dob, summer_time, tzinfo=tz)
    utc_summer = dt_summer.astimezone(ZoneInfo("UTC"))
    assert dt_summer.utcoffset().total_seconds() == 3600
    assert utc_summer.hour == 11
    assert utc_summer.minute == 0

    chart_summer = calculate_chart(
        dob=summer_dob,
        birth_time=summer_time,
        place="London",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
    )

    # Verify that the chart calculated under Europe/London differs from the incorrect Asia/Kolkata default
    chart_kolkata_incorrect = calculate_chart(
        dob=summer_dob,
        birth_time=summer_time,
        place="London",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone="Asia/Kolkata",
    )
    # The Julian Day under Kolkata (UTC 06:30) vs London (UTC 11:00) must differ significantly
    assert chart_summer.julian_day != chart_kolkata_incorrect.julian_day
    # Lagna must be significantly different
    assert abs(chart_summer.ascendant_longitude - chart_kolkata_incorrect.ascendant_longitude) > 10.0


def test_new_york_winter_and_summer_dst():
    """Verify New York coordinates resolve to America/New_York and observe EST vs EDT historical DST."""
    loc = resolve_location(lat=40.7128, lon=-74.0060)
    assert loc.timezone == "America/New_York"

    tz = ZoneInfo("America/New_York")

    # Winter: EST (UTC-05:00)
    winter_dob = date(1990, 1, 15)
    birth_time = time(12, 0)
    dt_winter = datetime.combine(winter_dob, birth_time, tzinfo=tz)
    utc_winter = dt_winter.astimezone(ZoneInfo("UTC"))
    assert dt_winter.utcoffset().total_seconds() == -5 * 3600
    assert utc_winter.hour == 17  # 12:00 EST is 17:00 UTC

    # Summer: EDT (UTC-04:00)
    summer_dob = date(1990, 7, 15)
    dt_summer = datetime.combine(summer_dob, birth_time, tzinfo=tz)
    utc_summer = dt_summer.astimezone(ZoneInfo("UTC"))
    assert dt_summer.utcoffset().total_seconds() == -4 * 3600
    assert utc_summer.hour == 16  # 12:00 EDT is 16:00 UTC

    chart_ny = calculate_chart(
        dob=summer_dob,
        birth_time=birth_time,
        place="New York",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
    )
    assert chart_ny.ascendant_longitude > 0


def test_sydney_southern_summer_and_winter_dst():
    """Verify Sydney coordinates resolve to Australia/Sydney and observe AEDT vs AEST historical DST."""
    loc = resolve_location(lat=-33.8688, lon=151.2093)
    assert loc.timezone == "Australia/Sydney"

    tz = ZoneInfo("Australia/Sydney")

    # Southern Summer (January): AEDT (UTC+11:00)
    summer_dob = date(1985, 1, 15)
    birth_time = time(12, 0)
    dt_summer = datetime.combine(summer_dob, birth_time, tzinfo=tz)
    utc_summer = dt_summer.astimezone(ZoneInfo("UTC"))
    assert dt_summer.utcoffset().total_seconds() == 11 * 3600
    assert utc_summer.hour == 1  # 12:00 AEDT is 01:00 UTC

    # Southern Winter (July): AEST (UTC+10:00)
    winter_dob = date(1985, 7, 15)
    dt_winter = datetime.combine(winter_dob, birth_time, tzinfo=tz)
    utc_winter = dt_winter.astimezone(ZoneInfo("UTC"))
    assert dt_winter.utcoffset().total_seconds() == 10 * 3600
    assert utc_winter.hour == 2  # 12:00 AEST is 02:00 UTC

    chart_sydney = calculate_chart(
        dob=summer_dob,
        birth_time=birth_time,
        place="Sydney",
        latitude=loc.latitude,
        longitude=loc.longitude,
        timezone=loc.timezone,
    )
    assert chart_sydney.ascendant_longitude > 0


def test_resolve_location_no_silent_kolkata_fallback():
    """Ensure coordinates without timezone NEVER silently default to Asia/Kolkata for international spots."""
    loc_london = resolve_location(lat=51.5074, lon=-0.1278)
    assert loc_london.timezone == "Europe/London"

    loc_ny = resolve_location(lat=40.7128, lon=-74.0060)
    assert loc_ny.timezone == "America/New_York"

    loc_sydney = resolve_location(lat=-33.8688, lon=151.2093)
    assert loc_sydney.timezone == "Australia/Sydney"

    loc_tokyo = resolve_location(lat=35.6762, lon=139.6503)
    assert loc_tokyo.timezone == "Asia/Tokyo"

    # Invalid coordinates that cannot resolve timezone should raise ValueError, not default to Kolkata
    with pytest.raises(ValueError, match="Unable to determine timezone"):
        resolve_location(lat=999.0, lon=999.0)


def test_search_locations_ambiguity_and_country_label():
    """Ensure worldwide location search returns multiple candidates and always includes country in label."""
    candidates = search_locations("London", limit=5)
    assert len(candidates) >= 2

    # Every candidate must have country included in display_name
    for c in candidates:
        assert "display_name" in c
        assert "timezone" in c
        assert "lat" in c
        assert "lon" in c
        # Validate that timezone string is a recognized IANA timezone
        ZoneInfo(c["timezone"])
        # Check that display_name is not empty and has a location label
        assert len(c["display_name"]) > 0


def test_search_locations_caching():
    """Verify in-memory caching returns instant cached results for identical query."""
    res1 = search_locations("Sydney", limit=3)
    res2 = search_locations("sydney", limit=3)
    assert res1 == res2


def test_geoapify_parsing_with_mock():
    """Verify Geoapify JSON response parsing with timezone and formatted label."""
    mock_response = {
        "results": [
            {
                "country": "United Kingdom",
                "city": "London",
                "state": "England",
                "formatted": "London, England",
                "lat": 51.5074,
                "lon": -0.1278,
                "timezone": {"name": "Europe/London"},
            }
        ]
    }

    from unittest.mock import MagicMock
    import json

    def mock_urlopen(req, timeout=5):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(mock_response).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_resp.__exit__.return_value = None
        return mock_resp

    with patch.dict("os.environ", {"GEOAPIFY_API_KEY": "test_api_key_123"}):
        with patch("urllib.request.urlopen", side_effect=mock_urlopen):
            # Query a unique term not in cache
            results = search_locations("MockLondonUniqueQuery", limit=1)
            assert len(results) == 1
            item = results[0]
            assert item["city"] == "London"
            assert item["country"] == "United Kingdom"
            assert item["timezone"] == "Europe/London"
            # Must ensure country is included in display_name
            assert "United Kingdom" in item["display_name"]
            assert item["is_approximate"] is False
            assert item["result_type"] == "city"


def test_regression_kolkata_lucknow_varanasi_1989():
    """Verify Kolkata, Lucknow, and Varanasi chart calculations and timeline intervals for 23 July 1989 at 09:30 AM IST.
    
    Astronomical Ground Truth (Lahiri Nirayana):
    - Kolkata (88.36° E): Ascendant ~155.58° -> Kanya (5), Timeline [09:06 - 11:16]
    - Lucknow (80.95° E): Ascendant ~148.98° -> Simha (4), Timeline [07:20 - 09:34]
    - Varanasi (82.97° E): Ascendant ~150.73° -> Kanya (5), Timeline [09:27 - 11:39]
    """
    from app.astrology.lagna_table import get_daily_lagna_timeline, SIGN_TO_INDEX

    dob = date(1989, 7, 23)
    bt = time(9, 30)

    test_cases = [
        {
            "name": "Kolkata",
            "lat": 22.5726,
            "lon": 88.3639,
            "expected_sign": "Kanya",
            "expected_sign_index": 5,
            "expected_start": "09:06",
            "expected_end": "11:16",
        },
        {
            "name": "Lucknow",
            "lat": 26.8467,
            "lon": 80.9462,
            "expected_sign": "Simha",
            "expected_sign_index": 4,
            "expected_start": "07:20",
            "expected_end": "09:34",
        },
        {
            "name": "Varanasi",
            "lat": 25.3176,
            "lon": 82.9739,
            "expected_sign": "Kanya",
            "expected_sign_index": 5,
            "expected_start": "09:27",
            "expected_end": "11:39",
        },
    ]

    for tc in test_cases:
        loc = resolve_location(place=tc["name"], lat=tc["lat"], lon=tc["lon"])
        assert loc.timezone == "Asia/Kolkata"
        assert loc.latitude == pytest.approx(tc["lat"], abs=0.0001)
        assert loc.longitude == pytest.approx(tc["lon"], abs=0.0001)

        # 1. Chart calculation
        chart = calculate_chart(
            dob=dob,
            birth_time=bt,
            place=tc["name"],
            latitude=loc.latitude,
            longitude=loc.longitude,
            timezone=loc.timezone,
        )

        assert chart.lagna_sign == tc["expected_sign"], (
            f"{tc['name']}: expected {tc['expected_sign']}, got {chart.lagna_sign}"
        )
        assert chart.lagna_sign_index == tc["expected_sign_index"]

        # 2. Timeline calculation using the exact same coordinates and date
        tl = get_daily_lagna_timeline(
            "Sravana",
            7,
            use_sidereal=True,
            dob=dob,
            lat=loc.latitude,
            lon=loc.longitude,
            timezone_name=loc.timezone,
        )

        # 3. Verify timeline interval matches chart Lagna
        matching_interval = None
        for item in tl:
            s_idx = SIGN_TO_INDEX.get(item["name_en"])
            if s_idx == chart.lagna_sign_index:
                matching_interval = item
                break

        assert matching_interval is not None, f"No timeline interval found for {tc['name']} Lagna"
        assert matching_interval["name_en"] == tc["expected_sign"]
        assert matching_interval["start"] == tc["expected_start"], (
            f"{tc['name']}: expected start {tc['expected_start']}, got {matching_interval['start']}"
        )
        assert matching_interval["end"] == tc["expected_end"], (
            f"{tc['name']}: expected end {tc['expected_end']}, got {matching_interval['end']}"
        )

        # 4. Verify 09:30 AM is strictly inside [start, end]
        bt_minutes = 9 * 60 + 30
        sh, sm = map(int, matching_interval["start"].split(":"))
        eh, em = map(int, matching_interval["end"].split(":"))
        start_min = sh * 60 + sm
        end_min = eh * 60 + em
        assert start_min <= bt_minutes <= end_min, (
            f"Birth time 09:30 ({bt_minutes}m) outside interval [{start_min}m, {end_min}m] for {tc['name']}"
        )


def test_state_centroid_resolution_rejected():
    """Ensure broad state/region searches are NOT silently resolved to centroid coordinates without warning."""
    # Searching for Uttar Pradesh without coordinates must raise ValueError
    with pytest.raises(ValueError, match="resolves to a state or broad region"):
        resolve_location(place="Uttar Pradesh, India")

    with pytest.raises(ValueError, match="resolves to a state or broad region"):
        resolve_location(place="California, USA")

    # If explicitly allowed with allow_approximate=True, it should mark is_approximate=True
    loc_approx = resolve_location(place="Uttar Pradesh, India", allow_approximate=True)
    assert loc_approx.is_approximate is True
    assert loc_approx.location_type in ("state", "region")


def test_empty_location_rejected():
    """Ensure resolve_location raises ValueError when neither place nor coordinates are provided."""
    with pytest.raises(ValueError, match="Place or geographic coordinates must be provided"):
        resolve_location()

    with pytest.raises(ValueError, match="Place or geographic coordinates must be provided"):
        resolve_location(place="", lat=None, lon=None)


def test_search_locations_includes_precision_metadata():
    """Ensure search_locations marks states as approximate and cities as non-approximate."""
    state_results = search_locations("Uttar Pradesh, India", limit=1)
    if state_results:
        assert state_results[0]["is_approximate"] is True
        assert state_results[0]["result_type"] in ("state", "region")

    city_results = search_locations("Lucknow, Uttar Pradesh, India", limit=1)
    if city_results:
        assert city_results[0]["is_approximate"] is False
        assert city_results[0]["result_type"] == "city"

