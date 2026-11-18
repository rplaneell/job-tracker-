from pathlib import Path

import pytest

from jobtracker.models import Role
from jobtracker.rules import Rules, load_rules, matches, tag_field, tag_level

RULES = Rules(
    countries=["Switzerland", "Spain"],
    include_keywords=["analyst", "intern", "business development"],
    exclude_keywords=["senior"],
    field_keywords={"health_science": ["health", "biotech"], "consulting": ["consultant"]},
    level_keywords={"internship": ["intern"], "entry_level": ["graduate"]},
)


def role(title="Business Analyst", country="Switzerland", description="") -> Role:
    return Role("greenhouse", "1", "Acme", title, "https://x", "", None, country, None, description, None)


def test_matches_requires_country_in_list():
    assert matches(role(country="Switzerland"), RULES)
    assert not matches(role(country="France"), RULES)


def test_matches_unknown_country_does_not_pass():
    assert not matches(role(country=None), RULES)


def test_matches_remote_europe_with_no_country_does_not_pass():
    r = Role("lever", "1", "Acme", "Analyst", "https://x", "Remote, Europe", None, None, True, "", None)
    assert not matches(r, RULES)


def test_matches_title_include_keyword_case_insensitive():
    assert matches(role(title="BUSINESS ANALYST INTERN"), RULES)


def test_matches_exclude_keyword_beats_include():
    assert not matches(role(title="Senior Business Analyst"), RULES)


def test_include_keyword_matches_whole_words_only():
    assert not matches(role(title="Internal Auditor"), RULES)


def test_tag_field_health_science_from_title_or_description():
    assert tag_field(role(title="Analyst", description="Work in biotech markets"), RULES) == "health_science"
    assert tag_field(role(title="Analyst"), RULES) is None


def test_tag_level_internship():
    assert tag_level(role(title="Analyst Intern"), RULES) == "internship"
    assert tag_level(role(title="Analyst"), RULES) is None


def test_load_rules_missing_key_raises_valueerror(tmp_path):
    p = tmp_path / "rules.yaml"
    p.write_text("countries: [Spain]\n")
    with pytest.raises(ValueError, match="include_keywords"):
        load_rules(p)


def test_shipped_rules_file_loads():
    rules = load_rules(Path(__file__).resolve().parents[2] / "rules.yaml")
    assert "Switzerland" in rules.countries


def _shipped():
    return load_rules(Path(__file__).resolve().parents[2] / "rules.yaml")


def test_shipped_rules_reject_engineering_marketing_and_sales_support_roles():
    rules = _shipped()
    for title in ["Software Engineer Intern - Fullstack", "Marketing Associate - Netherlands",
                  "Associate Account Executive - Netherlands", "Data Engineer", "Product Designer"]:
        assert not matches(role(title=title, country="Spain"), rules), title


def test_shipped_rules_keep_target_roles():
    rules = _shipped()
    for title in ["Business Analyst Intern", "Strategy Associate, Life Sciences", "Investment Analyst",
                  "Graduate Consultant", "Business Development Associate", "CDD Risk Analyst"]:
        assert matches(role(title=title, country="Spain"), rules), title


# Profile filter: the owner has R&D biotech and lab experience, and no management experience.

def test_required_years_parses_common_phrasings():
    from jobtracker.rules import required_years

    assert required_years("You have 5+ years of experience in consulting.") == 5
    assert required_years("3-5 years' experience in finance") == 3
    assert required_years("At least 4 years of relevant experience") == 4
    assert required_years("Minimum 2 years experience with SQL") == 2
    assert required_years("Experience: 2 to 4 years") == 2
    assert required_years("No experience needed, we train you.") is None
    assert required_years("Founded 10 years ago, we grew fast.") is None
    assert required_years("") is None


def test_required_years_takes_the_highest_requirement_mentioned():
    from jobtracker.rules import required_years

    assert required_years("2 years of experience in analytics and 6 years of experience leading teams") == 6


def test_matches_rejects_roles_asking_for_more_experience_than_the_profile_has():
    rules = Rules(["Spain"], ["analyst"], [], {}, {}, max_years_experience=2)
    assert not matches(role(country="Spain", description="Requires 5+ years of experience"), rules)
    assert matches(role(country="Spain", description="1 year of experience is a plus"), rules)
    assert matches(role(country="Spain", description="Great first job"), rules)
    assert matches(role(country="Spain", description="2 years of experience"), rules)


def test_matches_ignores_experience_when_no_limit_is_set():
    rules = Rules(["Spain"], ["analyst"], [], {}, {})
    assert matches(role(country="Spain", description="10 years of experience"), rules)


def test_shipped_rules_have_a_two_year_experience_limit():
    assert _shipped().max_years_experience == 2


def test_shipped_rules_reject_management_and_senior_titles():
    rules = _shipped()
    for title in ["Associate Partner Growth Manager - NL", "Head of CDD, EMEA", "General Manager Associate - Spain",
                  "Team Lead, Consulting", "Vice President, Finance", "Engineering Manager", "Chief of Staff Analyst",
                  "Principal Consultant", "Partner, Healthcare"]:
        assert not matches(role(title=title, country="Spain"), rules), title
