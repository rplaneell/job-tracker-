import pytest

from jobtracker.run import check_supabase_url


def test_a_project_api_address_is_accepted():
    assert check_supabase_url("https://bzcyywcxpppmxxddypng.supabase.co") == "https://bzcyywcxpppmxxddypng.supabase.co"


def test_a_trailing_slash_and_spaces_are_tolerated():
    assert check_supabase_url("  https://abc123.supabase.co/ \n") == "https://abc123.supabase.co"


@pytest.mark.parametrize(
    "bad",
    [
        "https://supabase.com/dashboard/project/abc123",  # the dashboard page, not the API
        "https://abc123.supabase.co/rest/v1",  # extra path
        "http://abc123.supabase.co",  # not encrypted
        "abc123.supabase.co",  # no scheme
        "https://example.com",
        "",
    ],
)
def test_anything_else_is_refused_with_a_plain_explanation(bad):
    with pytest.raises(SystemExit) as info:
        check_supabase_url(bad)
    assert "SUPABASE_URL" in str(info.value) and "https://" in str(info.value)
