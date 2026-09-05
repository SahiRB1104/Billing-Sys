from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_admin_login_returns_token():
    response = client.post('/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert 'access_token' in payload
    assert payload['token_type'] == 'bearer'


def test_cashier_cannot_access_admin_route():
    login = client.post('/auth/login', json={'username': 'cashier', 'password': 'cashier123'})
    token = login.json()['access_token']
    response = client.get('/admin/users', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403
