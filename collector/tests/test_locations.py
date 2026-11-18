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
