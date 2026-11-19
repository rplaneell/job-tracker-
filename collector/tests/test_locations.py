from jobtracker.adapters.locations import parse_location


def test_parse_location_zurich_with_umlaut():
    assert parse_location("Zürich, Switzerland") == ("Zurich", "Switzerland", False)


def test_parse_location_remote_europe():
    assert parse_location("Remote, Europe") == (None, None, True)


def test_parse_location_empty_string():
    assert parse_location("") == (None, None, None)


def test_parse_location_two_cities():
    assert parse_location("Köln or Basel") == ("Basel", "Switzerland", False)


def test_parse_location_country_only():
    assert parse_location("Denmark") == (None, "Denmark", False)


def test_parse_location_us_city_and_state():
    assert parse_location("Boston, MA") == ("Boston", "United States", False)
    assert parse_location("New York, NY") == ("New York", "United States", False)
    assert parse_location("Cambridge, MA, United States") == ("Cambridge", "United States", False)


def test_parse_location_us_country_names_and_remote():
    assert parse_location("United States") == (None, "United States", False)
    assert parse_location("Remote, USA") == (None, "United States", True)
    assert parse_location("Remote, United States") == (None, "United States", True)


def test_parse_location_does_not_take_other_countries_codes_for_us_states():
    # DE is Delaware but far more often Germany, and a two letter code that is not a state means nothing.
    assert parse_location("Berlin, DE") == (None, None, False)
    assert parse_location("Toronto, ON") == (None, None, False)
    assert parse_location("Remote, Europe") == (None, None, True)


def test_parse_location_still_prefers_the_european_city():
    assert parse_location("Zürich, Switzerland") == ("Zurich", "Switzerland", False)
