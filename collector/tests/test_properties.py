"""Property tests: rules that must hold for EVERY input, with thousands of generated, often hostile, inputs."""
import re
from dataclasses import replace

from hypothesis import given, settings, strategies as st

from jobtracker.adapters import safe_url, strip_html
from jobtracker.adapters.locations import CITIES, COUNTRIES, parse_location
from jobtracker.harvest import slug_from_url
from jobtracker.models import Role
from jobtracker.rules import Rules, matches, required_years

TARGET = {"Spain", "Switzerland", "Belgium", "Netherlands", "Denmark"}
text = st.text(max_size=200)
nasty = st.text(alphabet=st.characters(), max_size=300)


def role(title="Business Analyst", country="Spain", description=""):
    return Role("s", "1", "Acme", title, "https://x", "", None, country, None, description, None)


RULES = Rules(["Spain", "Switzerland"], ["analyst", "intern"], ["senior"], {}, {}, max_years_experience=2)


@settings(max_examples=300)
@given(nasty)
def test_parse_location_never_crashes_and_only_names_known_places(raw):
    city, country, remote = parse_location(raw)
    assert city is None or city.lower() in CITIES
    assert country is None or country in set(CITIES.values()) | set(COUNTRIES.values())
    assert remote in (None, True, False)


@settings(max_examples=300)
@given(nasty)
def test_required_years_is_none_or_a_small_number(raw):
    n = required_years(raw)
    assert n is None or (isinstance(n, int) and 0 <= n <= 99)


@given(st.text(alphabet=st.characters(blacklist_categories=("Nd",)), max_size=200))
def test_text_without_digits_never_states_a_requirement(raw):
    assert required_years(raw) is None


@settings(max_examples=300)
@given(nasty)
def test_strip_html_never_crashes_and_has_tidy_whitespace(raw):
    out = strip_html(raw)
    assert out == out.strip()
    assert "  " not in out


@settings(max_examples=300)
@given(nasty)
def test_safe_url_gives_empty_or_a_plain_web_link(raw):
    out = safe_url(raw)
    assert out == "" or re.match(r"^https?://[^\s<>\"'`]+$", out, re.I)
    assert "javascript:" not in out.lower()


@settings(max_examples=300)
@given(nasty)
def test_slug_from_url_gives_none_or_a_safe_board_name(raw):
    hit = slug_from_url(raw)
    if hit:
        kind, board = hit
        bare = board[3:] if board.startswith("eu:") else board
        assert re.match(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$", bare)


@settings(max_examples=300)
@given(text, st.sampled_from(["Spain", "France", None, "Switzerland"]), text)
def test_a_role_outside_the_target_countries_never_matches(title, country, desc):
    r = role(title, country, desc)
    if country not in RULES.countries:
        assert not matches(r, RULES)


@settings(max_examples=300)
@given(text, st.sampled_from(["Spain", "Switzerland", "France", None]), text, st.lists(st.text(min_size=1, max_size=12), max_size=4))
def test_more_exclusions_never_add_matches(title, country, desc, extra):
    r = role(title, country, desc)
    stricter = replace(RULES, exclude_keywords=RULES.exclude_keywords + extra)
    assert not (matches(r, stricter) and not matches(r, RULES))


@settings(max_examples=300)
@given(text, st.sampled_from(["Spain", "Switzerland"]), text)
def test_fewer_countries_never_add_matches(title, country, desc):
    r = role(title, country, desc)
    narrower = replace(RULES, countries=["Spain"])
    assert not (matches(r, narrower) and not matches(r, RULES))


@settings(max_examples=300)
@given(text, st.sampled_from(["Spain", "Switzerland"]), text, st.integers(0, 10))
def test_a_lower_experience_limit_never_adds_matches(title, country, desc, limit):
    r = role(title, country, desc)
    low = replace(RULES, max_years_experience=limit)
    high = replace(RULES, max_years_experience=limit + 1)
    assert not (matches(r, low) and not matches(r, high))


@settings(max_examples=300)
@given(text, text, st.sampled_from(["Spain", "Switzerland"]), text)
def test_a_title_with_an_excluded_word_never_matches(before, after, country, desc):
    r = role(f"analyst {before} senior {after}", country, desc)
    assert not matches(r, RULES)


@settings(max_examples=300)
@given(text, st.sampled_from(["Spain", "Switzerland"]), text)
def test_a_match_always_has_an_included_word_in_its_title(title, country, desc):
    r = role(title, country, desc)
    if matches(r, RULES):
        assert any(re.search(rf"(?<!\w){k}(?!\w)", title.lower()) for k in RULES.include_keywords)
