# Deliberately BAD code. Never shipped or run. The Semgrep self test fails if any rule does not fire on it.
import os, pickle, subprocess, yaml
import xml.etree.ElementTree
import httpx


def run(code, cmd, blob, text):
    eval(code)
    os.system(cmd)
    subprocess.run(cmd, shell=True)
    pickle.loads(blob)
    yaml.load(text)
    httpx.get("https://example.invalid", verify=False)
