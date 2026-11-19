"""Labels. The health science label means the role is about science: its title says so, or its posting is clearly about a science
field (several strong science terms), and the job itself is not shop floor work. One passing word in a benefits paragraph is never enough."""
from pathlib import Path

import pytest

from jobtracker.models import Role
from jobtracker.rules import load_rules, tag_field, tag_level

RULES = load_rules(Path(__file__).resolve().parents[2] / "rules.yaml")


def role(title, description=""):
    return Role("greenhouse", "1", "Acme", title, "https://x", "", "Zurich", "Switzerland", None, description, None)


BENEFITS = "We offer health insurance, a pension fund, equity, a strategy day, analytics tools, an intern buddy and a graduate scheme. We value patients of our wellness programme."
BIOTECH = ("We are a clinical stage biotechnology company developing therapeutics. Our pharmaceutical partners rely on our drug discovery platform "
           "and genomics data to support clinical trials for patients.")


@pytest.mark.parametrize("title", ["Warehouse Picker", "Receptionist", "SAP Applikationsmanager", "Sales Representative", "Restaurant Manager", "Coins Expert"])
def test_a_benefits_paragraph_never_labels_a_role(title):
    r = role(title, BENEFITS)
    assert tag_field(r, RULES) is None
    assert tag_level(r, RULES) is None


@pytest.mark.parametrize("title", ["Business Analyst", "Strategy Associate", "Finance Intern", "Operations Specialist", "Marketing Analyst"])
def test_a_business_role_in_a_science_company_is_a_science_role(title):
    assert tag_field(role(title, BIOTECH), RULES) == "health_science"


@pytest.mark.parametrize("title", ["Warehouse Picker", "Mitarbeiter Kommissionierung (m/w/d)", "Night Receptionist", "Restaurant Manager", "Kitchen Trainee", "Delivery Driver", "Cleaner"])
def test_shop_floor_and_hospitality_work_is_never_science_even_at_a_science_employer(title):
    assert tag_field(role(title, BIOTECH), RULES) != "health_science"


@pytest.mark.parametrize("title", ["Healthcare Specialist (Fluent in French) - Freelance AI Trainer Project", "Science Specialist - Freelance AI Trainer Project", "Medicine Specialist (Fluent in Dutch) - Freelance AI Trainer"])
def test_freelance_ai_trainer_gigs_are_not_science_work_even_with_a_science_word_in_the_title(title):
    assert tag_field(role(title), RULES) != "health_science"


def test_two_passing_mentions_are_not_a_science_role():
    two = "Our customers include a pharmaceutical group and a biotechnology start up. We sell office furniture."
    assert tag_field(role("Business Analyst", two), RULES) == "business_analyst"


@pytest.mark.parametrize(
    "title, field",
    [
        ("Life Sciences Consultant", "health_science"),
        ("Healthcare Strategy Analyst", "health_science"),
        ("Pharma Market Access Intern", "health_science"),
        ("Medical Affairs Associate", "health_science"),
        ("Strategy Analyst", "consulting"),
        ("Associate Consultant", "consulting"),
        ("Investment Banking Analyst", "finance"),
        ("Venture Capital Associate", "vc"),
        ("Business Analyst", "business_analyst"),
        ("Business Development Intern", "business_development"),
    ],
)
def test_the_title_still_gives_the_field(title, field):
    assert tag_field(role(title), RULES) == field


@pytest.mark.parametrize(
    "title, level",
    [("Strategy Intern", "internship"), ("Management Trainee", "internship"), ("Graduate Programme, Finance", "entry_level"), ("Junior Consultant", "entry_level"), ("Senior Manager", None)],
)
def test_the_title_gives_the_level_and_the_description_never_does(title, level):
    assert tag_level(role(title), RULES) == level
    assert tag_level(role(title if level else "Manager", BENEFITS), RULES) == level
