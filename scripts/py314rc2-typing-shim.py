# Compatibility shim for CPython 3.14.0rc2.
#
# rc2 named this typing._eval_type parameter `parent_fwdref`; pydantic (through
# at least 2.13.5) passes `prefer_fwd_module`, the name used in 3.14.0 final.
# Without this, importing pydantic raises:
#
#   TypeError: _eval_type() got an unexpected keyword argument 'prefer_fwd_module'
#
# which takes down anything importing openai/pydantic - i.e. the whole agent
# runtime. No released pydantic avoids it: 2.12.5 through 2.13.5 all pass the
# newer name, and uv 0.8.17 offers no 3.14.0 final build to run them against.
#
# Dropping the unknown kwarg falls back to default forward-ref resolution.
# CAVEAT: `prefer_fwd_module=True` asks typing to resolve a forward reference
# against the module that defined it. Falling back can resolve some string
# annotations (notably TypedDicts imported across modules) differently. Fine
# for ordinary use; delete this file once the interpreter is 3.14.0 final.
import typing

_orig_eval_type = typing._eval_type


def _eval_type(*args, **kwargs):
    kwargs.pop("prefer_fwd_module", None)
    return _orig_eval_type(*args, **kwargs)


typing._eval_type = _eval_type
