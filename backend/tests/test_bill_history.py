import time
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.models import InvoiceStatus, StockMovement, StockMovementType
from app.database import SessionLocal

client = TestClient(app)


def login(username: str, password: str) -> str:
    response = client.post('/auth/login', json={'username': username, 'password': password})
    assert response.status_code == 200, response.text
    return response.json()['access_token']


def create_sample_bill(admin_token: str, cashier_token: str):
    # 1. Create a sample product with known stock and price
    sku = f'SKU-BH-{int(time.time() * 1000)}'
    barcode = f'BAR-BH-{int(time.time() * 1000)}'
    create_prod = client.post(
        '/products',
        json={
            'name_mr': 'सोयाबीन तेल १ लिटर',
            'barcode': barcode,
            'sku': sku,
            'category_mr': 'तेल',
            'unit': 'लिटर',
            'purchase_price': 90,
            'selling_price': 110,
            'mrp': 120,
            'gst_rate': 5,
            'current_stock': 15,
            'low_stock_level': 3,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert create_prod.status_code == 200, create_prod.text
    product_id = create_prod.json()['id']

    # 2. Cashier bills 3 quantities
    bill_resp = client.post(
        '/bills',
        json={
            'payment_method': 'CASH',
            'discount': 0,
            'items': [{'product_id': product_id, 'quantity': 3, 'discount': 0}],
        },
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert bill_resp.status_code == 200, bill_resp.text
    inv_data = bill_resp.json()
    invoice_number = inv_data['invoice_number']

    return product_id, invoice_number


def test_list_invoices_and_search_by_number():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')
    _, invoice_number = create_sample_bill(admin_token, cashier_token)

    # List all invoices
    resp = client.get('/invoices', headers={'Authorization': f'Bearer {cashier_token}'})
    assert resp.status_code == 200
    invoices = resp.json()
    assert len(invoices) > 0

    # Find the created bill in list
    matching = [inv for inv in invoices if inv['invoice_number'] == invoice_number]
    assert len(matching) == 1
    assert matching[0]['created_by_username'] == 'cashier'

    # Search specifically by invoice number
    search_resp = client.get(
        f'/invoices?search={invoice_number}',
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert search_resp.status_code == 200
    search_items = search_resp.json()
    assert len(search_items) == 1
    assert search_items[0]['invoice_number'] == invoice_number


def test_invoice_date_filtering():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')
    _, invoice_number = create_sample_bill(admin_token, cashier_token)

    # Filter for today
    today_resp = client.get('/invoices?date_filter=today', headers={'Authorization': f'Bearer {cashier_token}'})
    assert today_resp.status_code == 200
    today_invoices = today_resp.json()
    assert any(inv['invoice_number'] == invoice_number for inv in today_invoices)

    # Filter for date range
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    range_resp = client.get(
        f'/invoices?start_date={today_str}&end_date={today_str}',
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert range_resp.status_code == 200
    range_invoices = range_resp.json()
    assert any(inv['invoice_number'] == invoice_number for inv in range_invoices)


def test_invoice_details_uses_stored_snapshot():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')
    product_id, invoice_number = create_sample_bill(admin_token, cashier_token)

    # Get invoice ID
    list_resp = client.get(f'/invoices?search={invoice_number}', headers={'Authorization': f'Bearer {cashier_token}'})
    invoice_id = list_resp.json()[0]['id']

    # Fetch detail
    detail_resp = client.get(f'/invoices/{invoice_id}', headers={'Authorization': f'Bearer {cashier_token}'})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail['invoice_number'] == invoice_number
    assert len(detail['items']) == 1
    assert detail['items'][0]['unit_price'] == 110.0
    assert detail['items'][0]['quantity'] == 3.0
    assert detail['items'][0]['total'] == 330.0

    # Now change product selling price in database (Admin price update)
    price_update = client.put(
        f'/products/{product_id}/price',
        json={'new_price': 150.0, 'reason': 'Supplier price hike'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert price_update.status_code == 200

    # Fetch invoice detail again: MUST STILL SHOW ORIGINAL SNAPSHOT PRICE (110, not 150)
    detail_after = client.get(f'/invoices/{invoice_id}', headers={'Authorization': f'Bearer {cashier_token}'}).json()
    assert detail_after['items'][0]['unit_price'] == 110.0
    assert detail_after['grand_total'] == 330.0


def test_admin_can_cancel_invoice_and_restore_stock():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')
    product_id, invoice_number = create_sample_bill(admin_token, cashier_token)

    # Verify stock after sale was 15 - 3 = 12
    prod_before = client.get(f'/products/{product_id}', headers={'Authorization': f'Bearer {admin_token}'}).json()
    assert prod_before['current_stock'] == 12

    # Get invoice ID
    list_resp = client.get(f'/invoices?search={invoice_number}', headers={'Authorization': f'Bearer {cashier_token}'})
    invoice_id = list_resp.json()[0]['id']

    # Admin cancels invoice
    cancel_resp = client.post(f'/invoices/{invoice_id}/cancel', headers={'Authorization': f'Bearer {admin_token}'})
    assert cancel_resp.status_code == 200
    cancelled_data = cancel_resp.json()
    assert cancelled_data['status'] == InvoiceStatus.CANCELLED.value

    # Check stock restored: 12 + 3 = 15
    prod_after = client.get(f'/products/{product_id}', headers={'Authorization': f'Bearer {admin_token}'}).json()
    assert prod_after['current_stock'] == 15

    # Verify RETURN stock movement was created in DB
    db = SessionLocal()
    try:
        return_mv = (
            db.query(StockMovement)
            .filter(
                StockMovement.product_id == product_id,
                StockMovement.type == StockMovementType.RETURN,
                StockMovement.reference_id == invoice_number,
            )
            .first()
        )
        assert return_mv is not None
        assert return_mv.quantity == 3.0
    finally:
        db.close()

    # Verify attempting to cancel again returns 400 Bad Request
    dup_cancel = client.post(f'/invoices/{invoice_id}/cancel', headers={'Authorization': f'Bearer {admin_token}'})
    assert dup_cancel.status_code == 400
    assert 'already cancelled' in dup_cancel.json()['detail']


def test_cashier_cannot_cancel_invoice():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')
    _, invoice_number = create_sample_bill(admin_token, cashier_token)

    list_resp = client.get(f'/invoices?search={invoice_number}', headers={'Authorization': f'Bearer {cashier_token}'})
    invoice_id = list_resp.json()[0]['id']

    # Cashier attempts to cancel invoice -> Must receive 403 Forbidden
    cancel_resp = client.post(f'/invoices/{invoice_id}/cancel', headers={'Authorization': f'Bearer {cashier_token}'})
    assert cancel_resp.status_code == 403
