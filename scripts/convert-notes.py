#!/usr/bin/env python3
"""Convert Anki TSV notes into structured JSON."""

from __future__ import annotations

import csv
import html
import json
import re
from pathlib import Path

SRC = Path("/Users/naim/Desktop/quranki/scripts/Selected Notes4.txt")
DST = Path("/Users/naim/Desktop/quranki/src/data/quranic-words.json")

LEVEL_RE = re.compile(r"Level\s+(\d+)\s*-\s*(.+)$")
PL_RE = re.compile(r"^pl\s*\(\s*(.+?)\s*\((.+)$")
FG_RE = re.compile(r"^fg\s*\(\s*(.+?)\s*\((.+)$")
TRAILING_PL_RE = re.compile(r"^(.+?)\s+pl$")
PAREN_RE = re.compile(r"^\((.+?)\s*\((.+)$")
SUFFIX_RE = re.compile(r"\.{2,}$")
STAR_RE = re.compile(r"\s*\*\s*$")


def clean(value: str) -> str:
    value = html.unescape(value).strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1].strip()
    return value


def split_forms(value: str) -> list[str]:
    parts = re.split(r"[،,]", value)
    return [p.strip() for p in parts if p.strip()]


def parse_arabic(raw: str) -> dict:
    arabic = clean(raw)
    extra: dict = {}

    is_suffix = bool(SUFFIX_RE.search(arabic))
    if is_suffix:
        extra["isSuffix"] = True
        arabic = SUFFIX_RE.sub("", arabic).strip()

    starred = bool(STAR_RE.search(arabic))
    if starred:
        arabic = STAR_RE.sub("", arabic).strip()

    match = PL_RE.match(arabic)
    if match:
        extra["arabic"] = match.group(1).strip()
        extra["plural"] = match.group(2).strip()
        return extra

    match = FG_RE.match(arabic)
    if match:
        extra["arabic"] = match.group(1).strip()
        extra["feminine"] = match.group(2).strip()
        return extra

    match = TRAILING_PL_RE.match(arabic)
    if match:
        extra["arabic"] = match.group(1).strip()
        extra["isPluralForm"] = True
        return extra

    match = PAREN_RE.match(arabic)
    if match:
        head = match.group(1).strip()
        tail = match.group(2).strip()
        extra["arabic"] = head
        if tail.startswith("+"):
            extra["attachesTo"] = "verb" if "فعل" in tail else tail.lstrip("+")
        elif "+" in tail:
            extra["contractionOf"] = tail
        else:
            forms = split_forms(tail)
            if len(forms) > 1:
                extra["forms"] = forms
            else:
                extra["variant"] = tail
        return extra

    extra["arabic"] = arabic
    forms = split_forms(arabic)
    if len(forms) > 1:
        extra["forms"] = forms
    return extra


def parse_english(raw: str) -> dict:
    english = clean(raw)
    extra: dict = {}

    if STAR_RE.search(english):
        english = STAR_RE.sub("", english).strip()

    extra["english"] = english
    return extra


def parse_level(deck: str) -> tuple[int, str]:
    deck = clean(deck)
    _, _, rest = deck.partition("::")
    match = LEVEL_RE.search(rest or deck)
    if not match:
        raise ValueError(f"Could not parse level from deck: {deck!r}")
    return int(match.group(1)), match.group(2).strip()


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    rows = [
        line
        for line in text.splitlines()
        if line.strip() and not line.startswith("#")
    ]

    levels: dict[int, dict] = {}
    word_count = 0

    for row in csv.reader(rows, delimiter="\t"):
        if len(row) < 3:
            raise ValueError(f"Expected 3 columns, got {len(row)}: {row!r}")

        number, title = parse_level(row[0])
        word = parse_arabic(row[1])
        word.update(parse_english(row[2]))

        bucket = levels.setdefault(
            number,
            {"number": number, "id": f"{number:02d}", "title": title, "words": []},
        )
        word_count += 1
        word["id"] = f"{number:02d}-{len(bucket['words']) + 1:03d}"
        bucket["words"].append(word)

    payload = {
        "deck": "Quranic Words",
        "levelCount": len(levels),
        "wordCount": word_count,
        "levels": [levels[key] for key in sorted(levels)],
    }

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {DST}")
    print(f"levels={payload['levelCount']} words={payload['wordCount']}")


if __name__ == "__main__":
    main()
