"""Command line tool: find company job boards in bulk and keep the ones that hire in the owner's regions.

    python -m jobtracker.findboards --crawl CC-MAIN-2026-43 --max-blocks 200 --verify-limit 500

Safe to stop and run again: results are saved in boards.state.json and already checked boards are skipped.
"""
from __future__ import annotations

import argparse
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

from jobtracker.harvest import PREFIXES, harvest_boards
from jobtracker.rules import load_rules
from jobtracker.run import USER_AGENT, make_client, repo_root
from jobtracker.verify import checks_from_state, load_state, save_state, verify_candidates, write_generated


def run(root: Path, crawl: str, kinds: list[str], max_blocks: int | None, verify_limit: int | None, cluster_file: Path | None) -> dict:
    rules = load_rules(root / "rules.yaml")
    state_path = root / "boards.state.json"
    state = load_state(state_path)

    cluster_text = None
    if cluster_file and cluster_file.exists():
        cluster_text = cluster_file.read_text()
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as plain:
        if cluster_text is None and cluster_file:
            url = f"https://data.commoncrawl.org/cc-index/collections/{crawl}/indexes/cluster.idx"
            cluster_text = plain.get(url, timeout=600).text
            cluster_file.write_text(cluster_text)
        candidates = harvest_boards(plain, crawl, kinds=kinds, max_blocks=max_blocks, cluster_text=cluster_text)

    # One polite client per hiring system: they are different hosts, so they can work side by side.
    lock = threading.Lock()
    by_kind = {k: {key: v for key, v in candidates.items() if key[0] == k} for k in kinds}

    def work(kind: str) -> int:
        client = make_client()
        try:
            local: dict = {}
            kept = verify_candidates(by_kind[kind], client, rules.countries, local, limit=verify_limit)
        finally:
            client.client.close()
        with lock:
            state.update(local)
        return len(kept)

    with ThreadPoolExecutor(max_workers=len(kinds)) as pool:
        kept_by_kind = dict(zip(kinds, pool.map(work, kinds)))

    save_state(state_path, state)
    checks = checks_from_state(state)
    write_generated(root / "sources.generated.yaml", checks)
    return {"candidates": len(candidates), "new_with_regional_roles": kept_by_kind, "total_boards_kept": len(checks), "boards_checked": len(state)}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--crawl", required=True, help="Common Crawl id, for example CC-MAIN-2026-43")
    ap.add_argument("--kinds", default=",".join(PREFIXES), help="hiring systems to look for, comma separated")
    ap.add_argument("--max-blocks", type=int, default=None, help="stop after this many index blocks (a small test run)")
    ap.add_argument("--verify-limit", type=int, default=None, help="check at most this many new boards per hiring system")
    ap.add_argument("--cluster-file", type=Path, default=None, help="where to keep the downloaded master index (saves 115 MB next time)")
    args = ap.parse_args(argv)
    kinds = [k for k in args.kinds.split(",") if k in PREFIXES]
    summary = run(repo_root(), args.crawl, kinds, args.max_blocks, args.verify_limit, args.cluster_file)
    for key, value in summary.items():
        print(f"{key}: {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
