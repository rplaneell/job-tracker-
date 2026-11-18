from pathlib import Path

import pytest

from jobtracker.models import Role
from jobtracker.rules import Rules, in_region, load_rules, matches

RULES = Rules(
    countries=["Switzerland", "Spain"],
    include_keywords=["analyst", "intern", "associate", "business development"],
    exclude_keywords=["senior", "social media", "quality assurance", "qa", "retail", "sales associate", "part-time", "part time"],
    field_keywords={},
    level_keywords={},
    city_limits={"Spain": ["Barcelona"]},
)


def role(city, country="Spain", raw="", title="Business Analyst"):
    return Role("greenhouse", "1", "Acme", title, "https://x", raw or (city or ""), city, country, None, "", None)


def test_a_spanish_role_in_barcelona_is_in_region_and_matches():
    assert in_region(role("Barcelona"), RULES) and matches(role("Barcelona"), RULES)


def test_a_spanish_role_in_madrid_is_out_of_region_and_does_not_match():
    assert not in_region(role("Madrid"), RULES) and not matches(role("Madrid"), RULES)


@pytest.mark.parametrize("city", ["barcelona", "BARCELONA", " Barcelona "])
def test_the_city_match_ignores_case_and_spaces(city):
    assert in_region(role(city), RULES)


def test_an_unknown_city_in_spain_is_not_trusted():
    assert not in_region(role(None, raw="Spain"), RULES)


def test_an_unknown_city_is_rescued_by_the_raw_location_text():
    assert in_region(role(None, raw="Barcelona, Catalonia, Spain (Hybrid)"), RULES)


def test_the_raw_text_must_name_the_city_as_a_whole_word():
    assert not in_region(role(None, raw="Barcelonetta Industrial Park"), RULES)


def test_countries_without_a_city_limit_are_unaffected():
    assert in_region(role("Zurich", "Switzerland"), RULES)
    assert in_region(role(None, "Switzerland"), RULES)


def test_a_country_outside_the_list_is_never_in_region():
    assert not in_region(role("Paris", "France"), RULES)
    assert not in_region(role(None, None), RULES)


def test_with_no_city_limits_a_whole_country_is_accepted_as_before():
    plain = Rules(["Spain"], ["analyst"], [], {}, {})
    assert in_region(role("Madrid"), plain)


@pytest.mark.parametrize(
    "title",
    ["Junior Social Media Associate", "Quality Assurance Analyst", "QA Analyst, Zurich", "Sales Associate (Full-Time) - Gstaad",
     "Operations Associate (Part-Time) - Amsterdam", "Retail Associate", "Part time Analyst"],
)
def test_clearly_off_target_titles_are_excluded(title):
    assert not matches(role("Zurich", "Switzerland", title=title), RULES)


@pytest.mark.parametrize("title", ["Business Analyst", "Strategy Associate", "Investment Analyst Intern", "Business Development Associate"])
def test_target_titles_still_match(title):
    assert matches(role("Zurich", "Switzerland", title=title), RULES)


def test_a_word_inside_another_word_does_not_trigger_an_exclusion():
    # "qa" must not hit "Aqaba", and "retail" must not hit "Retailer Insights Analyst" by accident of substring.
    assert matches(role("Zurich", "Switzerland", title="Analyst, Aqaba Region"), RULES)


def test_the_real_rules_file_limits_spain_to_barcelona_and_drops_noise():
    real = load_rules(Path(__file__).resolve().parents[2] / "rules.yaml")
    assert real.city_limits == {"Spain": ["Barcelona"]}
    assert matches(role("Barcelona", title="Data Analyst Intern"), real)
    assert not matches(role("Madrid", title="Data Analyst Intern"), real)
    assert not matches(role("Amsterdam", "Netherlands", title="Junior Social Media Associate"), real)
    assert not matches(role("Amsterdam", "Netherlands", title="Quality Assurance Analyst"), real)
    assert not matches(role("Amsterdam", "Netherlands", title="Sales Associate (Part-Time)"), real)
