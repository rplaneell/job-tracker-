import gzip
import json

import httpx
import respx

from jobtracker.harvest import (
    ClusterEntry,
    blocks_for_prefix,
    decode_block,
    harvest_boards,
    iter_urls,
    parse_cluster,
    slug_from_url,
)

CLUSTER = (
    "0,100,22,165)/ 20261005124020\tcdx-00000.gz\t0\t1000\t1\n"
    "co,lever,jobs)/acme/1 20261005124020\tcdx-00001.gz\t0\t500\t2\n"
    "co,lever,jobs)/beta/1 20261005124020\tcdx-00001.gz\t500\t500\t3\n"
    "co,lever,jobs)/zeta/1 20261005124020\tcdx-00001.gz\t1000\t500\t4\n"
    "com,zzz)/ 20261005124020\tcdx-00002.gz\t0\t900\t5\n"
)


def test_parse_cluster_reads_key_file_offset_length():
    entries = parse_cluster(CLUSTER)
    assert entries[1] == ClusterEntry("co,lever,jobs)/acme/1", "cdx-00001.gz", 0, 500)
    assert len(entries) == 5


def test_blocks_for_prefix_includes_the_block_before_the_first_match():
    entries = parse_cluster(CLUSTER)
    blocks = blocks_for_prefix(entries, "co,lever,jobs)/")
    assert [(b.file, b.offset) for b in blocks] == [("cdx-00000.gz", 0), ("cdx-00001.gz", 0), ("cdx-00001.gz", 500), ("cdx-00001.gz", 1000)]


def test_blocks_for_prefix_with_no_match_returns_only_the_covering_block():
    entries = parse_cluster(CLUSTER)
    assert [b.offset for b in blocks_for_prefix(entries, "org,nothing,")] == [0]


def test_decode_block_handles_several_gzip_members():
    raw = gzip.compress(b"line one\nline two\n") + gzip.compress(b"line three\n")
    assert decode_block(raw) == ["line one", "line two", "line three"]


def test_iter_urls_keeps_only_matching_status_200_lines():
    lines = [
        'co,lever,jobs)/acme 20261005 {"url": "https://jobs.lever.co/acme", "status": "200"}',
        'co,lever,jobs)/acme/x 20261005 {"url": "https://jobs.lever.co/acme/x", "status": "404"}',
        'co,other,www)/ 20261005 {"url": "https://www.other.co/", "status": "200"}',
        "co,lever,jobs)/broken 20261005 not json",
    ]
    assert list(iter_urls(lines, "co,lever,jobs)/")) == ["https://jobs.lever.co/acme"]


def test_slug_from_url_for_each_hiring_system():
    assert slug_from_url("https://jobs.lever.co/Acme-Corp/1234-abcd") == ("lever", "Acme-Corp")
    assert slug_from_url("https://jobs.eu.lever.co/novo/55") == ("lever", "eu:novo")
    assert slug_from_url("https://boards.greenhouse.io/stripe/jobs/1") == ("greenhouse", "stripe")
    assert slug_from_url("https://job-boards.greenhouse.io/figma") == ("greenhouse", "figma")
    assert slug_from_url("https://jobs.ashbyhq.com/Linear/abc") == ("ashby", "Linear")
    assert slug_from_url("https://acme.jobs.personio.de/job/55") == ("personio", "acme")
    assert slug_from_url("https://nordicfirm.teamtailor.com/jobs/1-x") == ("teamtailor", "nordicfirm")


def test_slug_from_url_rejects_reserved_and_malformed_names():
    assert slug_from_url("https://boards.greenhouse.io/embed/job_app?for=x") is None
    assert slug_from_url("https://jobs.lever.co/") is None
    assert slug_from_url("https://www.teamtailor.com/en/") is None
    assert slug_from_url("https://career.teamtailor.com/jobs") is None
    assert slug_from_url("https://jobs.lever.co/a%20b/1") is None
    assert slug_from_url("https://example.com/acme") is None
    assert slug_from_url("not a url") is None


@respx.mock
def test_harvest_boards_downloads_only_needed_ranges_and_dedupes_by_name():
    respx.get("https://data.commoncrawl.org/cc-index/collections/CC-X/indexes/cluster.idx").mock(
        return_value=httpx.Response(200, text=CLUSTER)
    )
    block = "\n".join(
        [
            'co,lever,jobs)/acme/1 20261005 ' + json.dumps({"url": "https://jobs.lever.co/acme/1", "status": "200"}),
            'co,lever,jobs)/Acme/2 20261005 ' + json.dumps({"url": "https://jobs.lever.co/Acme/2", "status": "200"}),
            'co,lever,jobs)/beta 20261005 ' + json.dumps({"url": "https://jobs.lever.co/beta", "status": "200"}),
        ]
    )
    calls = []

    def serve(request):
        calls.append(request.headers["range"])
        return httpx.Response(206, content=gzip.compress(block.encode()))

    respx.get(url__regex=r"https://data.commoncrawl.org/cc-index/collections/CC-X/indexes/cdx-0000\d.gz").mock(side_effect=serve)
    with httpx.Client() as client:
        found = harvest_boards(client, "CC-X", kinds=["lever"], sleep=lambda _s: None)
    assert sorted(found) == [("lever", "acme"), ("lever", "beta")]
    assert found[("lever", "acme")] == "acme"  # first spelling seen wins
    assert all(r.startswith("bytes=") for r in calls) and len(calls) == 4


@respx.mock
def test_harvest_boards_respects_the_block_limit():
    respx.get("https://data.commoncrawl.org/cc-index/collections/CC-X/indexes/cluster.idx").mock(
        return_value=httpx.Response(200, text=CLUSTER)
    )
    route = respx.get(url__regex=r".*cdx-0000\d.gz").mock(return_value=httpx.Response(206, content=gzip.compress(b"")))
    with httpx.Client() as client:
        harvest_boards(client, "CC-X", kinds=["lever"], max_blocks=2, sleep=lambda _s: None)
    assert route.call_count == 2
