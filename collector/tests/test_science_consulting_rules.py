"""The real rules.yaml must keep early career life science and health business roles and keep the noise out."""
from pathlib import Path

import pytest

from jobtracker.models import Role
from jobtracker.rules import load_rules, matches

RULES = load_rules(Path(__file__).resolve().parents[2] / "rules.yaml")


def role(title, country="Switzerland", city="Zurich", description=""):
    return Role("greenhouse", "1", "Acme", title, "https://x", "", city, country, None, description, None)


KEEP = [
    "Life Sciences Consultant",
    "Associate Consultant, Healthcare",
    "Associate Consultant (Life Sciences)",
    "Healthcare Strategy Analyst",
    "Market Access Analyst",
    "Pharma Business Development Associate",
    "Graduate Programme, Life Sciences",
    "Biotech Strategy Intern",
    "Medtech Business Analyst",
    "Junior Consultant, Life Sciences & Healthcare",
    "Healthcare Consulting Trainee",
    "Life Sciences Internship",
    "Research Analyst, Pharma",
    "Becario Consultoría Healthcare",
    "Analista de Estrategia Farmacéutica",
    "Life Sciences Commercial Excellence",
    "Healthcare Market Access, Junior",
    "Pharma Commercial Trainee",
    "Junior Health Economics and Outcomes Research",
    "Medtech Graduate Programme",
    "Early Careers, Biotech Strategy",
    "Life Science Programme Graduate",
    "Healthcare Innovation Fellow",
]

DROP = [
    "Senior Consultant Healthcare (w/m/d) 80-100%",
    "Consulting Partner in Pharma & Life Science (Strategy & Data/AI Transformation)",
    "Global Health Advisory - Engagement Manager",
    "Clinical Rater (Belgium)",
    "Clinical Specialist, Netherlands",
    "Healthcare Specialist (Fluent in French) - Freelance AI Trainer Project",
    "Science Specialist (Fluent in Dutch) - Freelance AI Trainer Project",
    "Scientist, Large Libraries",
    "HEALTH AND SAFETY PLANT LEAD",
    "Care Expert - Belgium",
    "Dental Lab Technician (Fixed)",
    "Pharmacist",
    "Senior Value Engineer (Pharma) - AI & Process Optimization",
    "Healthcare Software Engineer",
    "Pharma Sales Representative, Senior",
    "Warehouse Operator, Pharma Logistics",
    "Executive Assistant, Life Sciences",
    "Nurse Practitioner Healthcare",
    "Laboratory Technician, Biotech",
    "Pharma Driver",
]


@pytest.mark.parametrize("title", KEEP)
def test_real_early_career_science_and_health_business_titles_are_kept(title):
    assert matches(role(title), RULES), title


@pytest.mark.parametrize("title", DROP)
def test_senior_clinical_lab_and_gig_titles_stay_out(title):
    assert not matches(role(title), RULES), title


def test_the_target_places_are_unchanged():
    assert set(RULES.countries) == {"Spain", "Switzerland", "Belgium", "Netherlands", "Denmark"}
    assert RULES.city_limits == {"Spain": ["Barcelona"]}
    assert not matches(role("Life Sciences Consultant", country="France", city="Paris"), RULES)
    assert not matches(role("Life Sciences Consultant", country="Spain", city="Madrid"), RULES)
    assert matches(role("Life Sciences Consultant", country="Spain", city="Barcelona"), RULES)


def test_a_role_asking_for_many_years_is_still_out():
    assert not matches(role("Life Sciences Consultant", description="We need 5 years of experience in consulting."), RULES)
