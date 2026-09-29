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

Known blocker as of 2026-09-29: the repo's `uv.lock` uses a schema that
**uv 0.8.17 cannot parse** (`invalid type: boolean, expected a timestamp
string`). It needs a newer uv. Hermes targets Python 3.14; uv fetches that
itself.

Set `HERMES_DIR` if the checkout is not at `~/hermes-agent`. `spawn` also
checks `/home/user/hermes-agent` and `/opt/hermes-agent`.
