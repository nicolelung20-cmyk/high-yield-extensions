# scripts/

## spawn

Launches an agent backend. `spawn hermes local` is the main entry point.

```sh
bash scripts/spawn-install.sh   # links spawn into ~/.local/bin
spawn doctor                    # what is usable, and why not
spawn hermes local              # run Hermes with the local terminal backend
```

`spawn doctor` is the useful command when something is wrong: it names the
missing piece and the exact command that fixes it, instead of failing vaguely.

### Why this lives in the repo

An earlier `spawn-install.sh` existed only at `/tmp/spawn-install.sh`. Claude
Code web containers are ephemeral, so it vanished when the container was
reclaimed and could not be recovered — it had never been committed. Anything
meant to survive a reclaim belongs in git.

`spawn-install.sh` installs only this wrapper. It downloads nothing and runs no
third-party code.

## Installing Hermes (separate, manual step)

`spawn` wraps Hermes Agent (Nous Research, MIT) but does not install it. The
official one-liner is:

```sh
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

**That does not work from a Claude Code web container**, where the egress
policy returns 403 on CONNECT for `hermes-agent.nousresearch.com`. Run it on a
host with unrestricted egress.

Installing from source works with allowed hosts only (GitHub + PyPI):

```sh
git clone --depth 1 https://github.com/NousResearch/hermes-agent.git ~/hermes-agent
cd ~/hermes-agent && uv sync
```

`uv sync --frozen` fails on uv 0.8.17: the repo's `uv.lock` uses a newer
schema (`invalid type: boolean, expected a timestamp string`). Use
`uv pip install -e .` instead — it resolves from `pyproject.toml` and never
reads the lock file, so it works on older uv. Hermes targets Python 3.14; uv
downloads that itself.

Status as of 2026-09-29 (Hermes `4e8b7a71`): this installs and the CLI
dispatches, but the **agent runtime does not import**. `spawn doctor` reports
this as DEGRADED rather than ready.

Root cause, in order:

1. Hermes requires Python 3.14 — 46 of its 48 dependencies are gated behind
   `python_version >= '3.14'`, so a 3.13 venv installs almost nothing. 3.13 is
   not a workaround.
2. Its pinned `pydantic==2.13.4` (the same version `uv.lock` pins, so the lock
   would not have helped) fails on Python **3.14.0rc2**, which changed
   `typing._eval_type()` — `TypeError: unexpected keyword argument
   'prefer_fwd_module'`.
3. `uv 0.8.17` only offers `3.14.0rc2`; it has no final `3.14.0` build.
4. Final 3.14.0 needs a newer uv, whose install was blocked in this
   environment.

So this needs either a newer uv or a system Python 3.14.0 final. On a normal
machine the official installer handles all of it.

### Running it

Hermes is model-agnostic and needs an LLM provider configured before a chat
session will do anything (`hermes model`). That means provider API costs — a
deliberate decision, not a default.

Set `HERMES_DIR` if the checkout is not at `~/hermes-agent`. `spawn` also
checks `/home/user/hermes-agent` and `/opt/hermes-agent`.
