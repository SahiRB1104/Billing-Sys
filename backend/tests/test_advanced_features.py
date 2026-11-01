import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def login(username: str, password: str) -> str:
    response = client.post('/auth/login', json={'username': username, 'password': password})
    assert response.status_code == 200, response.text
    return response.json()['access_token']


def test_store_settings_lifecycle():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')

    # Cashier can read store settings
    res = client.get('/api/settings/store', headers={'Authorization': f'Bearer {cashier_token}'})
    assert res.status_code == 200
    data = res.json()
    assert 'store_name' in data

    # Cashier cannot update store settings
    update_res = client.put(
        '/api/settings/store',
        json={'store_name': 'Hacked Store'},
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert update_res.status_code == 403

    # Admin updates store settings
    update_res = client.put(
        '/api/settings/store',
        json={
            'store_name': 'श्री सिद्धेश्वर सुपर मार्केट',
            'owner_name': 'राजेंद्र देशमुख',
            'address': 'मेन रोड, बार्शी',
            'city': 'सोलापूर',
            'state': 'महाराष्ट्र',
            'pin_code': '413401',
            'country': 'भारत',
            'phone': '+91 94220 11223',
            'email': 'siddheshwar@market.com',
            'gst_enabled': True,
            'gstin': '27ABCDE1234F1Z5',
            'invoice_prefix': 'SSM',
            'currency_symbol': '₹',
            'receipt_header': '|| श्री स्वामी समर्थ ||',
            'receipt_footer': 'धन्यवाद! पुन्हा भेट द्या.',
            'tax_inclusive': True,
            'default_gst_rate': 5.0,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated['store_name'] == 'श्री सिद्धेश्वर सुपर मार्केट'
    assert updated['invoice_prefix'] == 'SSM'

    # Reset back to INV for standard tests
    client.put(
        '/api/settings/store',
        json={
            'store_name': 'श्री वैभव स्टोअर',
            'invoice_prefix': 'INV',
            'gst_enabled': True,
            'gstin': '27ABCDE1234F1Z5',
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )

    # Invalid GSTIN validation
    bad_gst = client.put(
        '/api/settings/store',
        json={
            'store_name': 'Test Store',
            'gst_enabled': True,
            'gstin': 'INVALID-GST-NUMBER',
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert bad_gst.status_code == 400


def test_payment_and_upi_settings():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')

    # Cashier cannot update payment settings
    res = client.put(
        '/api/settings/payment',
        json={'upi_enabled': True, 'upi_id': 'fraud@upi'},
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert res.status_code == 403

    # Admin updates payment settings
    res = client.put(
        '/api/settings/payment',
        json={
            'upi_enabled': True,
            'payee_name': 'श्री सिद्धेश्वर सुपर मार्केट',
            'upi_id': 'siddheshwar@okhdfcbank',
            'payment_description': 'Retail POS Bill Payment',
            'gateway_enabled': False,
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert res.status_code == 200
    data = res.json()
    assert data['upi_id'] == 'siddheshwar@okhdfcbank'

    # UPI URI generation
    uri_res = client.get(
        '/api/payments/upi-uri?amount=450.50&invoice_number=SSM-000100',
        headers={'Authorization': f'Bearer {cashier_token}'},
    )
    assert uri_res.status_code == 200
    uri_data = uri_res.json()
    assert 'upi://pay?' in uri_data['upi_uri']
    assert 'pa=siddheshwar@okhdfcbank' in uri_data['upi_uri']
    assert 'am=450.50' in uri_data['upi_uri']


def test_staff_management_workflow():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')

    # Cashier blocked from staff endpoints
    assert client.get('/admin/staff', headers={'Authorization': f'Bearer {cashier_token}'}).status_code == 403

    # Admin creates staff
    username = f'cashier_{uuid.uuid4().hex[:8]}'
    staff_res = client.post(
        '/admin/staff',
        json={
            'name': 'विजय गायकवाड',
            'username': username,
            'password': 'password123',
            'role': 'CASHIER',
            'contact_number': '9922133445',
            'email': 'vijay@market.com',
            'staff_id': 'CSH-002',
            'document_type': 'Aadhaar',
            'document_ref': '123456789012',
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert staff_res.status_code == 200, staff_res.text
    staff = staff_res.json()
    staff_id = staff['id']

    # Admin updates staff
    edit_res = client.put(
        f'/admin/staff/{staff_id}',
        json={'contact_number': '9922100000', 'document_status': 'VERIFIED'},
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert edit_res.status_code == 200
    assert edit_res.json()['document_status'] == 'VERIFIED'

    # Admin uploads document
    doc_res = client.post(
        f'/admin/staff/{staff_id}/documents',
        json={
            'original_name': 'aadhar_card.pdf',
            'mime_type': 'application/pdf',
            'document_data': 'data:application/pdf;base64,JVBERi0xLjQKJc...',
        },
        headers={'Authorization': f'Bearer {admin_token}'},
    )
    assert doc_res.status_code == 200
    doc_id = doc_res.json()['id']

    # Admin views private doc
    get_doc = client.get(f'/admin/documents/{doc_id}', headers={'Authorization': f'Bearer {admin_token}'})
    assert get_doc.status_code == 200
    assert get_doc.json()['original_name'] == 'aadhar_card.pdf'

    # Cashier cannot view private doc
    assert client.get(f'/admin/documents/{doc_id}', headers={'Authorization': f'Bearer {cashier_token}'}).status_code == 403


def test_billing_tax_breakdown_and_idempotency():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')

    # Get a product
    products = client.get('/products', headers={'Authorization': f'Bearer {cashier_token}'}).json()
    assert len(products) > 0
    p = products[0]

    # Checkout with customer details & cash change
    idempotency_key = 'test-idemp-key-12345'
    checkout_payload = {
        'payment_method': 'CASH',
        'discount': 5.0,
        'items': [{'product_id': p['id'], 'quantity': 1, 'discount': 0.0}],
        'customer_name': 'अमोल जोशी',
        'customer_phone': '9890123456',
        'cash_tendered': 100.0,
        'change_returned': 100.0 - (float(p['selling_price']) - 5.0),
        'idempotency_key': idempotency_key,
    }

    res1 = client.post('/bills', json=checkout_payload, headers={'Authorization': f'Bearer {cashier_token}'})
    assert res1.status_code == 200
    bill1 = res1.json()
    assert bill1['customer_name'] == 'अमोल जोशी'
    assert 'cgst_amount' in bill1
    assert 'sgst_amount' in bill1

    # Repeat submission with same idempotency key must not double-charge or create another invoice
    res2 = client.post('/bills', json=checkout_payload, headers={'Authorization': f'Bearer {cashier_token}'})
    assert res2.status_code == 200
    bill2 = res2.json()
    assert bill2['invoice_number'] == bill1['invoice_number']


def test_dashboard_stats_and_csv_export():
    admin_token = login('admin', 'admin123')
    cashier_token = login('cashier', 'cashier123')

    # Dashboard stats
    stats_res = client.get('/api/dashboard/stats', headers={'Authorization': f'Bearer {cashier_token}'})
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert 'today_sales' in stats
    assert 'today_bills_count' in stats
    assert 'payment_breakdown' in stats
    assert 'daily_trend' in stats

    # CSV Export
    export_res = client.get('/invoices/export', headers={'Authorization': f'Bearer {admin_token}'})
    assert export_res.status_code == 200
    assert export_res.headers['content-type'].startswith('text/csv')
    assert 'Invoice Number' in export_res.text
