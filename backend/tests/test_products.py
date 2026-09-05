from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def login(username: str, password: str):
    response = client.post('/auth/login', json={'username': username, 'password': password})
    assert response.status_code == 200, response.text
    return response.json()['access_token']


def test_admin_can_create_and_find_product():
    admin_token = login('admin', 'admin123')
    payload = {
        'name_mr': 'तुळसाचे पान',
        'barcode': 'PT-1001',
        'sku': 'SKU-1001',
        'category_mr': 'भाजी',
        'unit': 'किलो',
        'hsn_code': '0709',
        'purchase_price': 25,
        'selling_price': 30,
        'mrp': 35,
        'gst_rate': 5,
        'current_stock': 50,
        'low_stock_level': 10,
    }

    create_response = client.post(
        '/products',
        json=payload,
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert create_response.status_code == 200, create_response.text
    product = create_response.json()
    assert product['name_mr'] == 'तुळसाचे पान'

    search_response = client.get('/products/search?query=तुळस', headers={'Authorization': f'Bearer {admin_token}'})
    assert search_response.status_code == 200, search_response.text
    items = search_response.json()
    assert any(item['barcode'] == 'PT-1001' for item in items)


def test_cashier_can_search_but_cannot_edit_product():
    cashier_token = login('cashier', 'cashier123')

    search_response = client.get('/products/search?query=PT-1001', headers={'Authorization': f'Bearer {cashier_token}'})
    assert search_response.status_code == 200, search_response.text
    items = search_response.json()
    assert any(item['barcode'] == 'PT-1001' for item in items)

    update_response = client.put(
        '/products/1',
        json={'selling_price': 40},
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert update_response.status_code == 403, update_response.text


def test_admin_can_update_price_and_store_history():
    admin_token = login('admin', 'admin123')
    create_response = client.post(
        '/products',
        json={
            'name_mr': 'गोडसेप',
            'barcode': 'PT-2001',
            'sku': 'SKU-2001',
            'category_mr': 'मसाला',
            'unit': 'किलो',
            'purchase_price': 20,
            'selling_price': 28,
            'mrp': 30,
            'gst_rate': 5,
            'current_stock': 12,
            'low_stock_level': 3,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert create_response.status_code == 200, create_response.text
    product = create_response.json()
    product_id = product['id']

    update_response = client.put(
        f'/products/{product_id}/price',
        json={'new_price': 32, 'reason': 'पुरवठादाराची किंमत वाढली'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert update_response.status_code == 200, update_response.text
    payload = update_response.json()
    assert payload['old_price'] == 28
    assert payload['new_price'] == 32
    assert payload['reason'] == 'पुरवठादाराची किंमत वाढली'

    fetch_response = client.get(f'/products/{product_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert fetch_response.status_code == 200, fetch_response.text
    assert fetch_response.json()['selling_price'] == 32

    cashier_token = login('cashier', 'cashier123')
    forbidden_response = client.put(
        f'/products/{product_id}/price',
        json={'new_price': 35, 'reason': 'cashier change'},
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert forbidden_response.status_code == 403, forbidden_response.text


def test_search_products_phonetic_english():
    admin_token = login('admin', 'admin123')
    # Create a product with Marathi name 'टाटा मीठ'
    client.post(
        '/products',
        json={
            'name_mr': 'ट Tata मीठ',
            'barcode': 'TM-9001',
            'sku': 'SKU-9001',
            'category_mr': 'मसाला',
            'unit': 'किलो',
            'purchase_price': 15,
            'selling_price': 22,
            'mrp': 25,
            'gst_rate': 5,
            'current_stock': 20,
            'low_stock_level': 5,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )

    # Search for 'tata' which should match 'टाटा मीठ'
    search_tata = client.get('/products/search?query=tata', headers={'Authorization': f'Bearer {admin_token}'})
    assert search_tata.status_code == 200
    tata_items = search_tata.json()
    assert any('टाटा' in item['name_mr'] or 'Tata' in item['name_mr'] for item in tata_items)

    # Search for 'kanda' which should match 'कांदा'
    search_kanda = client.get('/products/search?query=kanda', headers={'Authorization': f'Bearer {admin_token}'})
    assert search_kanda.status_code == 200
    kanda_items = search_kanda.json()
    assert any('कांदा' in item['name_mr'] for item in kanda_items)


def test_barcode_lookup_and_duplicate_rejection():
    admin_token = login('admin', 'admin123')

    first_response = client.post(
        '/products',
        json={
            'name_mr': 'तांदूळ ५ किलो',
            'barcode': '8901234567891',
            'sku': 'SKU-BAR-1',
            'category_mr': 'धान्य',
            'unit': 'किलो',
            'purchase_price': 150,
            'selling_price': 250,
            'mrp': 260,
            'gst_rate': 5,
            'current_stock': 10,
            'low_stock_level': 2,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert first_response.status_code == 200, first_response.text

    lookup_response = client.get(
        '/products/barcode/8901234567891',
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert lookup_response.status_code == 200, lookup_response.text
    assert lookup_response.json()['barcode'] == '8901234567891'

    duplicate_response = client.post(
        '/products',
        json={
            'name_mr': 'दुसरे तांदूळ',
            'barcode': '8901234567891',
            'sku': 'SKU-BAR-2',
            'category_mr': 'धान्य',
            'unit': 'किलो',
            'purchase_price': 150,
            'selling_price': 240,
            'mrp': 250,
            'gst_rate': 5,
            'current_stock': 5,
            'low_stock_level': 1,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert duplicate_response.status_code == 400, duplicate_response.text


