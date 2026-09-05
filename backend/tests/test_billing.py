from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def login(username: str, password: str):
    response = client.post('/auth/login', json={'username': username, 'password': password})
    assert response.status_code == 200, response.text
    return response.json()['access_token']


def test_invoice_creation_reduces_stock_and_generates_number():
    admin_token = login('admin', 'admin123')
    create_product = client.post(
        '/products',
        json={
            'name_mr': 'तपकिरी डाळ',
            'barcode': 'TD-2001',
            'sku': 'SKU-2001',
            'category_mr': 'धान्य',
            'unit': 'किलो',
            'hsn_code': '1001',
            'purchase_price': 50,
            'selling_price': 60,
            'mrp': 65,
            'gst_rate': 5,
            'current_stock': 10,
            'low_stock_level': 2,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert create_product.status_code == 200, create_product.text
    product_id = create_product.json()['id']

    cashier_token = login('cashier', 'cashier123')
    bill_response = client.post(
        '/bills',
        json={
            'payment_method': 'CASH',
            'discount': 0,
            'items': [
                {'product_id': product_id, 'quantity': 2, 'discount': 0},
            ],
        },
        headers={'Authorization': f'Bearer {cashier_token}'},
    )

    assert bill_response.status_code == 200, bill_response.text
    payload = bill_response.json()
    assert payload['invoice_number'].startswith('INV-')
    assert payload['grand_total'] == 120.0
    assert payload['stock_after_sale'] == 8


def test_failed_invoice_rolls_back_stock():
    admin_token = login('admin', 'admin123')
    create_product = client.post(
        '/products',
        json={
            'name_mr': 'कांदा',
            'barcode': 'KD-3001',
            'sku': 'SKU-3001',
            'category_mr': 'भाजी',
            'unit': 'किलो',
            'hsn_code': '0703',
            'purchase_price': 20,
            'selling_price': 25,
            'mrp': 28,
            'gst_rate': 5,
            'current_stock': 1,
            'low_stock_level': 1,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )

    product_id = create_product.json()['id']
    cashier_token = login('cashier', 'cashier123')
    bill_response = client.post(
        '/bills',
        json={
            'payment_method': 'UPI',
            'discount': 0,
            'items': [{'product_id': product_id, 'quantity': 2, 'discount': 0}],
        },
        headers={'Authorization': f'Bearer {cashier_token}'},
    )

    assert bill_response.status_code == 400, bill_response.text
    assert 'Insufficient stock' in bill_response.json()['detail']
