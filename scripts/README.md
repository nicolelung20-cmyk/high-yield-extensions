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

Working as of 2026-09-29 (Hermes `4e8b7a71`, Python 3.14.0rc2), with one
shim. Full sequence:

```sh
git clone --depth 1 https://github.com/NousResearch/hermes-agent.git ~/hermes-agent
cd ~/hermes-agent && uv venv --python 3.14 && uv pip install -e .
spawn repair          # only needed on Python 3.14.0rc2
spawn doctor          # should report: status ready
```

### Why `uv pip install -e .` and not `uv sync`

`uv sync --frozen` fails on uv 0.8.17: the repo's `uv.lock` uses a newer schema
(`invalid type: boolean, expected a timestamp string`). `uv pip install -e .`
resolves from `pyproject.toml` and never reads the lock, so it works on older
uv. Note Hermes needs Python **3.14** — 46 of its 48 dependencies are gated
behind `python_version >= '3.14'`, so a 3.13 venv installs almost nothing.

### Why `spawn repair` exists

On Python 3.14.0**rc2**, importing pydantic dies with:

```
TypeError: _eval_type() got an unexpected keyword argument 'prefer_fwd_module'
```

rc2 named that `typing._eval_type` parameter `parent_fwdref`; pydantic passes
`prefer_fwd_module`, the name in 3.14.0 final. This is **not** fixable by
changing the pin — 2.12.5, 2.13.0-2.13.3, 2.13.4 (what `uv.lock` pins) and
2.13.5 (latest) were all tested on rc2 and fail identically. uv 0.8.17 offers
no 3.14.0 final build.

`spawn repair` installs `py314rc2-typing-shim.py` as `sitecustomize.py` in the
venv, dropping the unknown kwarg. It is idempotent and re-probes afterwards.
The shim lives in this repo because `.venv` is disposable.

**Caveat:** the shim falls back to default forward-ref resolution, which can
differ for string annotations in TypedDicts imported across modules. Delete
`sitecustomize.py` once the interpreter is 3.14.0 final.

## Provider config

`hermes-config.example.yaml` holds this venture's provider choice: **copilot**
(GitHub Models), on a `GITHUB_TOKEN` free tier rather than a paid key.

```sh
hermes config set model.provider copilot   # non-interactive, works anywhere
hermes model                               # picks the model from the live catalog
```

Config lands in `~/.hermes/config.yaml`, secrets in `~/.hermes/.env`.

### This cannot be finished in a Claude Code web container

Two independent blockers, both verified:

1. `hermes model` refuses non-interactive use ("requires an interactive
   terminal"). Forcing a pty with `script` gets past that check and then hangs
   on the catalog fetch.
2. Every copilot inference endpoint is refused by the egress policy with
   403 on CONNECT: `models.github.ai`, `api.githubcopilot.com`,
   `models.inference.ai.azure.com`.

So no chat session can run here regardless of provider. Set the model on a
machine with unrestricted egress. Do not hand-write `model.default` — an
invented id fails at request time.

Set `HERMES_DIR` if the checkout is not at `~/hermes-agent`. `spawn` also
checks `/home/user/hermes-agent` and `/opt/hermes-agent`.
