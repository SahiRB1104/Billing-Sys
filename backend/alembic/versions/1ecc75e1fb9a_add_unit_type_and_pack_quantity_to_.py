"""add unit_type and pack_quantity to products

Revision ID: 1ecc75e1fb9a
Revises: f1024a950997
Create Date: 2026-09-05 11:37:59.230270

"""
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1ecc75e1fb9a'
down_revision: Union[str, Sequence[str], None] = 'f1024a950997'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_KEYWORDS = [
    ('किलो', 'किलो'), ('लिटर', 'लिटर'), ('ग्रॅम', 'ग्रॅम'), ('मिली', 'मिली'),
    ('डझन', 'डझन'), ('पॅकेट', 'पॅकेट'), ('बॉक्स', 'बॉक्स'), ('बाटली', 'बाटली'),
    ('liter', 'लिटर'), ('ltr', 'लिटर'), ('kg', 'किलो'), ('kilo', 'किलो'),
    ('gram', 'ग्रॅम'), ('gm', 'ग्रॅम'), ('ml', 'मिली'), ('milli', 'मिली'),
    ('dozen', 'डझन'), ('dz', 'डझन'), ('packet', 'पॅकेट'), ('pack', 'पॅकेट'),
    ('box', 'बॉक्स'), ('bottle', 'बाटली'), ('नग', 'नग'),
]


def _map_legacy_unit(value: Union[str, None]) -> tuple[Union[str, None], Union[float, None]]:
    if not value:
        return None, None
    lowered = str(value).lower()
    unit_type = next((mapped for keyword, mapped in _KEYWORDS if keyword.lower() in lowered), 'नग')
    match = re.search(r'\d+(?:\.\d+)?', str(value))
    quantity = float(match.group(0)) if match else None
    return unit_type, quantity


def upgrade() -> None:
    """Add unit_type/pack_quantity columns (idempotent) and backfill from legacy unit."""
    bind = op.get_bind()
    table_names = set(sa.inspect(bind).get_table_names())
    if 'products' not in table_names:
        return

    existing_columns = {column['name'] for column in sa.inspect(bind).get_columns('products')}
    with op.batch_alter_table('products') as batch_op:
        if 'unit_type' not in existing_columns:
            batch_op.add_column(sa.Column('unit_type', sa.String(length=50), nullable=True))
        if 'pack_quantity' not in existing_columns:
            batch_op.add_column(sa.Column('pack_quantity', sa.Numeric(12, 2), nullable=True))

    products = sa.table(
        'products',
        sa.column('id', sa.Integer),
        sa.column('unit', sa.String),
        sa.column('unit_type', sa.String),
        sa.column('pack_quantity', sa.Numeric),
    )
    rows = bind.execute(sa.select(products.c.id, products.c.unit)).fetchall()
    for row_id, legacy_unit in rows:
        unit_type, pack_quantity = _map_legacy_unit(legacy_unit)
        if unit_type is None and pack_quantity is None:
            continue
        bind.execute(
            products.update()
            .where(products.c.id == row_id)
            .values(unit_type=unit_type, pack_quantity=pack_quantity)
        )


def downgrade() -> None:
    """Drop unit_type/pack_quantity columns (idempotent)."""
    bind = op.get_bind()
    table_names = set(sa.inspect(bind).get_table_names())
    if 'products' not in table_names:
        return
    existing_columns = {column['name'] for column in sa.inspect(bind).get_columns('products')}
    with op.batch_alter_table('products') as batch_op:
        if 'unit_type' in existing_columns:
            batch_op.drop_column('unit_type')
        if 'pack_quantity' in existing_columns:
            batch_op.drop_column('pack_quantity')