from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, inspect, text
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
    connect_args={'check_same_thread': False},
    future=True,
)
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
    """Idempotently add unit_type/pack_quantity columns to an existing products table."""
    try:
        inspector = inspect(engine)
        if 'products' not in inspector.get_table_names():
            return
        columns = {column['name'] for column in inspector.get_columns('products')}
        with engine.begin() as connection:
            if 'unit_type' not in columns:
                connection.execute(text('ALTER TABLE products ADD COLUMN unit_type VARCHAR(50)'))
            if 'pack_quantity' not in columns:
                connection.execute(text('ALTER TABLE products ADD COLUMN pack_quantity NUMERIC(12, 2)'))
    except Exception as exc:  # pragma: no cover - defensive: never block startup
        print(f'[store-pos] schema upgrade skipped: {exc}')


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
