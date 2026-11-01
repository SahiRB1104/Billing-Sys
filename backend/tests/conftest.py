import pytest
from app.database import SessionLocal
from app.models import InvoiceItem, Product, ProductPriceHistory, StockMovement

TEST_BARCODES = {
    'TD-2001',
    'KD-3001',
    'PT-1001',
    'PT-2001',
    '8901234567891',
    'TM-9001',
}


def clean_test_data():
    from app.models import StoreSettings

    db = SessionLocal()
    try:
        prods = db.query(Product).filter(Product.barcode.in_(TEST_BARCODES)).all()
        for p in prods:
            db.query(InvoiceItem).filter(InvoiceItem.product_id == p.id).delete()
            db.query(StockMovement).filter(StockMovement.product_id == p.id).delete()
            db.query(ProductPriceHistory).filter(ProductPriceHistory.product_id == p.id).delete()
            db.delete(p)
        store = db.query(StoreSettings).first()
        if store:
            store.invoice_prefix = 'INV'
        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True, scope='session')
def isolate_test_data_session():
    clean_test_data()
    yield
    clean_test_data()
