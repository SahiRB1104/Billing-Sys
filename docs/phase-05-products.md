# Phase 05 — Product Management

## Goal

Implement product creation, editing and searching.

---

# Product Language

The shopkeeper primarily uses Marathi.

Therefore:

```text
उत्पादनाचे नाव
```

is the main product-name field.

Example:

```text
टाटा मीठ १ किलो
```

English product name is NOT required.

---

# Product Fields

```text
उत्पादनाचे नाव *
बारकोड
SKU
वर्ग
एकक
HSN कोड
खरेदी किंमत
विक्री किंमत
MRP
GST
सुरुवातीचा साठा
किमान साठा
```

---

# API

Implement:

```text
GET    /products
GET    /products/search
GET    /products/{id}
POST   /products
PUT    /products/{id}
```

---

# Search

Search by:

```text
Marathi product name
Barcode
SKU
```

Example:

```text
टाटा
```

finds:

```text
टाटा मीठ १ किलो
```

Barcode:

```text
8901030...
```

also finds the product.

---

# Permissions

ADMIN:

```text
Create
Edit
```

CASHIER:

```text
Search/View
```

Cashier cannot modify important product information.

---

# Definition of Done

* Admin can create products.
* Marathi product name works.
* Barcode works.
* SKU works.
* Product search works.
* Admin can edit products.
* Cashier can search products.
* Cashier cannot modify protected product data.

STOP HERE.
