"""S0-U1-L04 browser vs website executor (first stage, not a web classroom).

PROVENANCE: no detailed lesson file for S0 on main. Built ONLY from the
register entry: title '比较浏览器与网站', focus concept '文件', generic
acceptance. All items and classifications are implementation choices, NOT
detailed-lesson values.
Fixed table (implementation choices):
  browsers: Chrome, Edge, Firefox, Safari
  websites: 学校网站, 视频网站, 新闻网站, 图书馆网站
Model: a comparison is correct when, after a start event:
  - at least 2 browsers and at least 2 websites are classified;
  - every item is in the table and its kind matches the table;
  - no item is classified twice;
  - at most 60 blocks.
Key idea (stated in the design, not enforced by a separate check):
a browser is the tool that opens websites; a website is the content
that is opened. One browser can open many websites.
Practice A: Chrome browser, Edge browser, 学校网站 website, 视频网站 website.
Practice B: Firefox browser, Safari browser, 新闻网站 website, 学校网站 website.
Fault: a wrong kind; an unknown item; only browsers; a duplicate item.
Extension: a 5th item (图书馆网站 website) passes.
This executor does NOT prove web classroom access, independent teaching review,
nor child trial. Those remain missing.
"""

TABLE = {
    "Chrome": "browser", "Edge": "browser",
    "Firefox": "browser", "Safari": "browser",
    "学校网站": "website", "视频网站": "website",
    "新闻网站": "website", "图书馆网站": "website",
}


class BrowserError(Exception):
    pass


def run_program(blocks):
    if not blocks or blocks[0].get("type") != "when_start":
        raise BrowserError("缺少开始事件：第一个积木必须是开始事件")
    if len(blocks) > 60:
        raise BrowserError("程序过长：超过60个积木")
    seen = {}
    for b in blocks[1:]:
        if b.get("type") != "item":
            raise BrowserError(f"不支持的积木类型：{b.get('type')}")
        name = b.get("name")
        kind = b.get("kind")
        if name not in TABLE:
            raise BrowserError(f"未知项目 {name}")
        if TABLE[name] != kind:
            raise BrowserError(f"{name} 应为 {TABLE[name]}，不是 {kind}")
        if name in seen:
            raise BrowserError(f"项目 {name} 重复")
        seen[name] = kind
    browsers = [n for n, k in seen.items() if k == "browser"]
    websites = [n for n, k in seen.items() if k == "website"]
    if len(browsers) < 2:
        raise BrowserError("比较至少要列出 2 个浏览器")
    if len(websites) < 2:
        raise BrowserError("比较至少要列出 2 个网站")
    return {"status": "success", "browsers": sorted(browsers),
            "websites": sorted(websites)}


def correct_program():
    return [
        {"type": "when_start"},
        {"type": "item", "name": "Chrome", "kind": "browser"},
        {"type": "item", "name": "Edge", "kind": "browser"},
        {"type": "item", "name": "学校网站", "kind": "website"},
        {"type": "item", "name": "视频网站", "kind": "website"},
    ]


if __name__ == "__main__":
    import json
    print(json.dumps(run_program(correct_program()), ensure_ascii=False, indent=2))
