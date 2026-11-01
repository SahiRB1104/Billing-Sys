# Phase 04 — Authentication & Roles

## Goal

Implement simple local login and role-based access.

---

# Roles

Only:

```text
ADMIN
CASHIER
```

---

# Admin

Admin can eventually:

* Add products
* Edit products
* Change prices
* Change GST
* Adjust stock
* View bills
* Reprint bills
* Cancel bills
* Manage settings
* Manage users

---

# Cashier

Cashier can eventually:

* Create bills
* Search products
* Scan barcode
* Change quantity
* Apply allowed discount
* Accept payment
* Print bills
* View bills

Cashier cannot:

* Change price
* Change GST
* Adjust stock
* Delete products
* Manage users
* Change settings

---

# Security Rule

Permissions MUST be checked in FastAPI.

Do NOT rely on React hiding buttons.

If cashier calls an admin endpoint directly:

```text
403 Forbidden
```

---

# Authentication

Use:

* password hashing
* JWT
* local users

Do NOT implement:

* Google login
* OAuth
* cloud authentication
* social login

---

# Definition of Done

* Admin can log in.
* Cashier can log in.
* JWT authentication works.
* Role is available to backend.
* Admin-only authorization works.
* Cashier cannot access admin operations.

STOP HERE.
