# Phase 03 — SQLite Database

## Goal

Connect FastAPI to a local SQLite database using SQLAlchemy.

The application is an offline retail POS, so SQLite is the primary database for V1.

---

# 1. Database Choice

Use:

```text
SQLite
```

Do NOT use:

* PostgreSQL
* MySQL
* MongoDB
* Redis
* cloud databases

SQLite is already installed on the development machine.

Python also provides SQLite support through its built-in `sqlite3` module.

---

# 2. Database Location

Create:

```text
backend/data/
```

The database file should be:

```text
backend/data/store.db
```

Final structure:

```text
backend/
├── app/
├── data/
│   └── store.db
├── venv/
├── .env
└── requirements.txt
```

Create the `data` directory if it does not exist.

---

# 3. SQLAlchemy

Use:

```text
SQLAlchemy 2
```

SQLAlchemy must be responsible for application database access.

Do NOT write raw SQL throughout the application.

Raw SQL is acceptable only when there is a genuine reason and SQLAlchemy cannot reasonably handle the operation.

---

# 4. Database URL

Use a local SQLite URL.

Example:

```text
sqlite:///./data/store.db
```

The actual path must resolve correctly from the backend working directory.

Do not hard-code database paths in multiple files.

Keep the database configuration in one place.

---

# 5. Database File

The database is local application data.

Do NOT commit the actual database file to Git.

Add:

```text
backend/data/*.db
```

to `.gitignore`.

The application should create the database automatically if it does not exist.

---

# 6. Database Connection

Create a simple:

```text
backend/app/database.py
```

It should contain:

* SQLAlchemy engine
* Session factory
* Declarative Base
* database session dependency

Keep this file simple.

Do not create unnecessary database abstraction layers.

---

# 7. SQLite Configuration

For FastAPI, configure SQLite correctly for local application use.

Use the appropriate SQLite connection arguments required for FastAPI's request handling.

Do not add unnecessary database configuration.

---

# 8. Initial Models

Create only the models required for V1.

```text
users
products
invoices
invoice_items
stock_movements
product_price_history
```

Do NOT create:

* suppliers
* customers
* purchases
* expenses
* employees
* loyalty
* accounting
* advanced GST tables

Those belong to future phases.

---

# 9. Users Table

Structure:

```text
users
-----
id
name
username
password_hash
role
is_active
created_at
```

Roles:

```text
ADMIN
CASHIER
```

Authentication will be implemented in a later phase.

For this phase, only create the model.

---

# 10. Products Table

The store user primarily speaks Marathi.

Therefore the product name must be Marathi.

Structure:

```text
products
--------
id
barcode
sku
name_mr
category_mr
unit
hsn_code
gst_rate
purchase_price
selling_price
mrp
current_stock
low_stock_level
is_active
created_at
updated_at
```

## Important

`name_mr` is required.

There is NO required `name_en`.

Example:

```text
name_mr:
टाटा मीठ १ किलो
```

The product does not need an English name.

---

# 11. Product Price Fields

Keep these separate:

```text
purchase_price
selling_price
mrp
```

Meaning:

```text
purchase_price
= price the shop paid

selling_price
= current price charged to customer

mrp
= MRP printed on product
```

Example:

```text
Purchase Price: ₹28
Selling Price: ₹32
MRP: ₹35
```

---

# 12. Invoices Table

Structure:

```text
invoices
--------
id
invoice_number
invoice_date
subtotal
discount
tax_amount
grand_total
payment_method
status
created_by
created_at
```

Payment methods:

```text
CASH
UPI
CARD
CREDIT
```

Status:

```text
COMPLETED
CANCELLED
```

---

# 13. Invoice Items

Structure:

```text
invoice_items
-------------
id
invoice_id
product_id
product_name_mr
quantity
unit_price
discount
gst_rate
tax_amount
total
```

## Important Business Rule

Store the product name and price used at the time of billing.

Do NOT depend on the current product table for old invoices.

Example:

Today:

```text
टाटा मीठ १ किलो
₹28
```

Tomorrow Admin changes:

```text
₹28 → ₹32
```

Yesterday's invoice must still contain:

```text
टाटा मीठ १ किलो
₹28
```

---

# 14. Stock Movements

Structure:

```text
stock_movements
---------------
id
product_id
type
quantity
reference_id
created_at
```

Types:

```text
OPENING
SALE
RETURN
ADJUSTMENT
```

For example:

```text
SALE
quantity = -2
```

Stock movement tracking will be used by the billing and inventory phases.

---

# 15. Product Price History

Structure:

```text
product_price_history
---------------------
id
product_id
old_price
new_price
changed_by
reason
changed_at
```

Example:

```text
Product:
टाटा मीठ १ किलो

Old Price:
₹28

New Price:
₹32

Changed By:
Admin

Reason:
पुरवठादाराची किंमत वाढली
```

This allows the store owner to know when and why a price changed.

---

# 16. Relationships

Required relationships:

```text
User
 │
 ├── creates invoices
 │
 └── changes product prices

Product
 │
 ├── invoice items
 ├── stock movements
 └── price history

Invoice
 │
 └── invoice items
```

Keep relationships simple.

---

# 17. Migrations

Use a proper migration system such as Alembic when creating the database schema.

Do not manually recreate tables every time the application starts.

The database should eventually be updated through migrations.

Initial migration should create the V1 tables.

---

# 18. Database Transaction Requirement

The database must support transactions.

This will be important during billing.

A future billing operation will perform:

```text
Create Invoice
      +
Create Invoice Items
      +
Decrease Stock
      +
Create Stock Movement
```

These must succeed together.

If one operation fails:

```text
ROLLBACK
```

Nothing should be partially saved.

Do not implement the billing transaction in this phase.

Only ensure the database architecture supports it.

---

# 19. Database Test

Create a simple test that:

1. Starts the application.
2. Connects to SQLite.
3. Creates/uses `store.db`.
4. Verifies database connectivity.

Do not create test data unless needed.

---

# 20. Git Rules

Never commit:

```text
backend/data/*.db
backend/venv/
backend/.env
__pycache__/
```

These are local/environment files.

---

# Definition of Done

Phase 3 is complete when:

* SQLite is configured.
* `backend/data/store.db` is created automatically.
* SQLAlchemy connects successfully.
* Database session works.
* Initial models exist.
* Relationships exist where required.
* Migrations are configured.
* Initial migration creates the V1 tables.
* Database connectivity is tested.
* `.db` files are ignored by Git.
* No product/billing API has been implemented yet.

STOP HERE.

Do not start Phase 4 automatically.
