"""S0-U1-L05 URL reliability executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '识别可靠网址', focus concept '网络', generic
acceptance. All URLs and rules are implementation choices, NOT
detailed-lesson values, and NOT a real security guarantee: in class,
an unknown link is treated as not proven reliable and must be checked
with a teacher or guardian, never clicked on a dare.
Rules (classroom heuristics, in order):
  1. If the URL does not start with https://, it is unreliable.
  2. If the domain contains a bait word (free, prize, gift, login-free),
     it is unreliable.
  3. If the domain ends with .edu.cn or .gov.cn, it is reliable.
  4. If the domain is in the trusted list, it is reliable.
  5. Otherwise it is unreliable (unknown: ask an adult).
Model: after a start event, at least 4 checks, including at least 1
reliable and at least 1 unreliable judgement; every verdict must match
the rules; no URL may be checked twice; at most 60 blocks.
Practice A: https://www.school.edu.cn reliable,
https://news.gov.cn reliable, http://free-prize.xyz unreliable,
https://school-login-free.com unreliable.
Practice B: https://library.school.edu.cn reliable,
https://www.gov.cn reliable, http://www.school.edu.cn unreliable,
https://free-gift.com unreliable.
Fault: a wrong verdict; only reliable judgements; a duplicate URL.
Extension: a 5th check, https://unknown-site.com unreliable (unknown).
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TRUSTED = {"www.school.edu.cn", "library.school.edu.cn"}
BAIT = ("free", "prize", "gift", "login-free")


class UrlError(Exception):
    pass


def expected_verdict(url):
    if not url.startswith("https://"):
        return "unreliable"
    rest = url[len("https://"):]
    domain = rest.split("/")[0]
    if any(word in domain for word in BAIT):
        return "unreliable"
    if domain.endswith(".edu.cn") or domain.endswith(".gov.cn"):
        return "reliable"
    if domain in TRUSTED:
        return "reliable"
    return "unreliable"


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise UrlError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise UrlError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "check":
            raise UrlError(f"不支持的积木类型：{b.get('type')}")
        url = b.get("url")
        verdict = b.get("verdict")
        if not url:
            raise UrlError("网址不能为空")
        if url in seen:
            raise UrlError(f"网址 {url} 重复检查")
        if verdict not in ("reliable", "unreliable"):
            raise UrlError(f"网址 {url} 的判断必须是 reliable 或 unreliable")
        if verdict != expected_verdict(url):
            raise UrlError(f"网址 {url} 的判断错误，应为 {expected_verdict(url)}")
        seen[url] = verdict
    if len(seen) < 4:
        raise UrlError("识别可靠网址至少要检查 4 个网址")
    if "reliable" not in seen.values():
        raise UrlError("至少要判断出 1 个可靠网址")
    if "unreliable" not in seen.values():
        raise UrlError("至少要判断出 1 个不可靠网址")
    return {"status": "success", "checks": seen}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "check", "url": "https://www.school.edu.cn", "verdict": "reliable"},
        {"type": "check", "url": "https://news.gov.cn", "verdict": "reliable"},
        {"type": "check", "url": "http://free-prize.xyz", "verdict": "unreliable"},
        {"type": "check", "url": "https://school-login-free.com", "verdict": "unreliable"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
