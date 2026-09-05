from __future__ import annotations

import re

UNIT_TYPE_KEYWORDS: list[tuple[str, str]] = [
    ('किलो', 'किलो'),
    ('लिटर', 'लिटर'),
    ('ग्रॅम', 'ग्रॅम'),
    ('मिली', 'मिली'),
    ('डझन', 'डझन'),
    ('पॅकेट', 'पॅकेट'),
    ('बॉक्स', 'बॉक्स'),
    ('बाटली', 'बाटली'),
    ('liter', 'लिटर'),
    ('ltr', 'लिटर'),
    ('kg', 'किलो'),
    ('kilo', 'किलो'),
    ('gram', 'ग्रॅम'),
    ('gm', 'ग्रॅम'),
    ('ml', 'मिली'),
    ('milli', 'मिली'),
    ('dozen', 'डझन'),
    ('dz', 'डझन'),
    ('packet', 'पॅकेट'),
    ('pack', 'पॅकेट'),
    ('box', 'बॉक्स'),
    ('bottle', 'बाटली'),
    ('नग', 'नग'),
]


def map_legacy_unit(value: str | None) -> tuple[str | None, float | None]:
    """Best-effort mapping of legacy free-text unit values to (unit_type, pack_quantity)."""
    if value is None:
        return None, None

    raw = str(value).strip()
    if not raw:
        return None, None

    lowered = raw.lower()
    unit_type = None
    for keyword, mapped in UNIT_TYPE_KEYWORDS:
        if keyword.lower() in lowered:
            unit_type = mapped
            break

    if unit_type is None:
        unit_type = 'नग'

    number_match = re.search(r'\d+(?:\.\d+)?', raw)
    pack_quantity: float | None = None
    if number_match is not None:
        try:
            pack_quantity = float(number_match.group(0))
        except ValueError:
            pack_quantity = None

    return unit_type, pack_quantity


def format_pack_quantity(value: float | None) -> str | None:
    if value is None:
        return None
    try:
        return f'{value:g}'
    except (TypeError, ValueError):
        return str(value)


def product_unit_display(unit_type: str | None, pack_quantity: float | None, legacy_unit: str | None = None) -> str | None:
    """Combined pack-size display string, e.g. '1 किलो'."""
    if unit_type and pack_quantity is not None:
        return f'{format_pack_quantity(pack_quantity)} {unit_type}'.strip()
    if unit_type:
        return unit_type
    return legacy_unit