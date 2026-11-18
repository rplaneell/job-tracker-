"""A tiny in-memory stand in for the parts of the supabase client the Store uses."""
from __future__ import annotations

from types import SimpleNamespace


class FakeClient:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {"roles": [], "applications": [], "source_runs": [], "agent_tasks": [], "scout_verdicts": [], "audit_log": [], "cv_master": [], "cv_versions": []}
        self.touched: list[str] = []
        self.after_select = None  # optional hook: simulates another session acting right after a read

    def table(self, name: str) -> "_Query":
        self.touched.append(name)
        return _Query(self, name)


class _Query:
    def __init__(self, client: FakeClient, name: str) -> None:
        self.client, self.name = client, name
        self.op = None
        self.payload = None
        self.filters: list = []
        self.on_conflict = None
        self.order_by = None
        self.max_rows = None

    @property
    def rows(self) -> list[dict]:
        return self.client.tables[self.name]

    def select(self, _cols="*"):
        self.op = "select"
        return self

    def eq(self, col, value):
        self.filters.append(lambda r: r.get(col) == value)
        return self

    def in_(self, col, values):
        values = set(values)
        self.filters.append(lambda r: r.get(col) in values)
        return self

    def lt(self, col, value):
        self.filters.append(lambda r: r.get(col) is not None and r.get(col) < value)
        return self

    def order(self, col, desc=False):
        self.order_by = (col, desc)
        return self

    def limit(self, n):
        self.max_rows = n
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def insert(self, payload):
        self.op, self.payload = "insert", payload
        return self

    def upsert(self, payload, on_conflict):
        self.op, self.payload, self.on_conflict = "upsert", payload, on_conflict
        return self

    def execute(self):
        match = [r for r in self.rows if all(f(r) for f in self.filters)]
        if self.op == "select":
            if self.order_by:
                col, desc = self.order_by
                match = sorted(match, key=lambda r: r.get(col), reverse=desc)
            if self.max_rows is not None:
                match = match[: self.max_rows]
            data = [dict(r) for r in match]
            if self.client.after_select:
                self.client.after_select()
            return SimpleNamespace(data=data)
        if self.op == "update":
            for r in match:
                r.update(self.payload)
            return SimpleNamespace(data=match)
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            self.rows.extend(dict(i) for i in items)
            return SimpleNamespace(data=items)
        if self.op == "upsert":
            cols = self.on_conflict.split(",")
            for item in self.payload:
                found = [r for r in self.rows if all(r.get(c) == item.get(c) for c in cols)]
                if found:
                    found[0].update(item)  # columns absent from item stay as they were
                else:
                    new = dict(item)
                    new.setdefault("id", f"{self.name}-{len(self.rows)}")  # the real database generates ids
                    self.rows.append(new)
            return SimpleNamespace(data=self.payload)
        raise AssertionError("no operation set")
