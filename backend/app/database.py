from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv(Path(__file__).resolve().parents[1] / '.env')


class Settings(BaseSettings):
    database_url: str = 'sqlite:///./data/store.db'

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )


settings = Settings()


class Base(DeclarativeBase):
    pass


BACKEND_DIR = Path(__file__).resolve().parents[1]


def get_resolved_database_url(raw_url: str) -> str:
    pos_data_dir = os.environ.get('POS_DATA_DIR')
    if pos_data_dir and raw_url == 'sqlite:///./data/store.db':
        data_dir = Path(pos_data_dir).resolve()
        data_dir.mkdir(parents=True, exist_ok=True)
        return f'sqlite:///{data_dir / "store.db"}'

    if raw_url.startswith('sqlite:///') and not raw_url.startswith('sqlite:////'):
        rel_path = raw_url.replace('sqlite:///', '', 1)
        target = Path(rel_path)
        if not target.is_absolute():
            resolved = (BACKEND_DIR / target).resolve()
            resolved.parent.mkdir(parents=True, exist_ok=True)
            return f'sqlite:///{resolved}'
    return raw_url


engine = create_engine(
    get_resolved_database_url(settings.database_url),
    connect_args={'check_same_thread': False, 'timeout': 30},
    future=True,
)


@event.listens_for(engine, 'connect')
def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
    """Enable SQLite WAL mode and crash-safe pragmas for offline POS durability."""
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA synchronous=NORMAL;')
        cursor.execute('PRAGMA foreign_keys=ON;')
        cursor.execute('PRAGMA busy_timeout=5000;')
        cursor.close()
    except Exception:
        pass


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def ensure_schema_upgrades() -> None:
    """Safely and idempotently upgrade existing database tables with new columns."""
    try:
        # First ensure all tables defined in metadata exist
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())

        with engine.begin() as connection:
            # Upgrade products table
            if 'products' in table_names:
                product_cols = {c['name'] for c in inspector.get_columns('products')}
                if 'unit_type' not in product_cols:
                    connection.execute(text('ALTER TABLE products ADD COLUMN unit_type VARCHAR(50)'))
                if 'pack_quantity' not in product_cols:
                    connection.execute(text('ALTER TABLE products ADD COLUMN pack_quantity NUMERIC(12, 2)'))

            # Upgrade users table with staff management fields
            if 'users' in table_names:
                user_cols = {c['name'] for c in inspector.get_columns('users')}
                new_user_cols = [
                    ('contact_number', 'VARCHAR(50)'),
                    ('email', 'VARCHAR(120)'),
                    ('address', 'TEXT'),
                    ('staff_id', 'VARCHAR(50)'),
                    ('joining_date', 'VARCHAR(30)'),
                    ('document_type', 'VARCHAR(50)'),
                    ('document_ref', 'VARCHAR(100)'),
                    ('document_status', 'VARCHAR(30) DEFAULT "PENDING"'),
                    ('document_notes', 'TEXT'),
                    ('document_submitted_at', 'DATETIME'),
                    ('hard_copy_collected', 'BOOLEAN DEFAULT 0'),
                    ('must_change_password', 'BOOLEAN DEFAULT 0'),
                    ('otp_code', 'VARCHAR(10)'),
                    ('otp_expires_at', 'DATETIME'),
                    ('updated_at', 'DATETIME'),
                ]
                for col_name, col_type in new_user_cols:
                    if col_name not in user_cols:
                        connection.execute(text(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}'))

            # Upgrade invoice_items table with partial return tracking
            if 'invoice_items' in table_names:
                inv_item_cols = {c['name'] for c in inspector.get_columns('invoice_items')}
                if 'returned_quantity' not in inv_item_cols:
                    connection.execute(text('ALTER TABLE invoice_items ADD COLUMN returned_quantity NUMERIC(10, 2) DEFAULT 0'))

            # Upgrade invoices table with customer and tax breakdown fields
            if 'invoices' in table_names:
                invoice_cols = {c['name'] for c in inspector.get_columns('invoices')}
                new_inv_cols = [
                    ('customer_name', 'VARCHAR(120)'),
                    ('customer_phone', 'VARCHAR(50)'),
                    ('taxable_amount', 'NUMERIC(12, 2) DEFAULT 0'),
                    ('cgst_amount', 'NUMERIC(12, 2) DEFAULT 0'),
                    ('sgst_amount', 'NUMERIC(12, 2) DEFAULT 0'),
                    ('payment_reference', 'VARCHAR(100)'),
                    ('payment_status', 'VARCHAR(30) DEFAULT "PAID"'),
                    ('paid_amount', 'NUMERIC(12, 2) DEFAULT 0'),
                    ('balance_due', 'NUMERIC(12, 2) DEFAULT 0'),
                    ('parent_invoice_id', 'INTEGER'),
                    ('cash_tendered', 'NUMERIC(12, 2)'),
                    ('change_returned', 'NUMERIC(12, 2)'),
                    ('notes', 'TEXT'),
                ]
                for col_name, col_type in new_inv_cols:
                    if col_name not in invoice_cols:
                        connection.execute(text(f'ALTER TABLE invoices ADD COLUMN {col_name} {col_type}'))

    except Exception as exc:  # pragma: no cover
        print(f'[store-pos] schema upgrade skipped: {exc}')


def seed_default_settings() -> None:
    from app.models import PaymentSettings, StoreSettings

    db: Session = SessionLocal()
    try:
        if db.query(StoreSettings).first() is None:
            store = StoreSettings(
                store_name='श्री वैभव स्टोअर',
                owner_name='वैभव पाटील',
                address='दुकान क्र. १२, मार्केट यार्ड, नवी पेठ',
                city='सोलापूर',
                state='महाराष्ट्र',
                pin_code='413002',
                country='भारत',
                phone='+91 98765 43210',
                email='vaibhav.store@gmail.com',
                gst_enabled=True,
                gstin='27ABCDE1234F1Z5',
                invoice_prefix='INV',
                currency_symbol='₹',
                locale='mr-IN',
                receipt_header='|| श्री गणेशाय नमः ||',
                receipt_footer='धन्यवाद! पुन्हा भेट द्या.',
                tax_inclusive=True,
                default_gst_rate=5.0,
            )
            db.add(store)

        if db.query(PaymentSettings).first() is None:
            payment = PaymentSettings(
                upi_enabled=True,
                payee_name='श्री वैभव स्टोअर',
                upi_id='vaibhavstore@upi',
                payment_description='Retail Store Payment',
                gateway_enabled=False,
                gateway_provider='MANUAL',
            )
            db.add(payment)

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f'[store-pos] seed settings error: {exc}')
    finally:
        db.close()


def backfill_product_units() -> None:
    """Map legacy free-text unit values into unit_type/pack_quantity for existing rows."""
    from app.models import Product
    from app.units import map_legacy_unit

    db: Session = SessionLocal()
    try:
        rows = db.query(Product).filter(Product.unit_type.is_(None)).all()
        updated = 0
        for product in rows:
            unit_type, pack_quantity = map_legacy_unit(product.unit)
            if unit_type is None and pack_quantity is None:
                continue
            product.unit_type = unit_type
            product.pack_quantity = pack_quantity
            updated += 1
        if updated:
            db.commit()
    finally:
        db.close()
