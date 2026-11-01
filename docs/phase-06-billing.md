# Phase 06 — Billing

## Goal

Implement the actual billing workflow.

This is the core application feature.

---

# Billing Flow

```text
नवीन बिल
   ↓
उत्पादन शोधा / बारकोड स्कॅन करा
   ↓
कार्टमध्ये जोडा
   ↓
प्रमाण बदला
   ↓
सूट
   ↓
GST
   ↓
पेमेंट
   ↓
बिल जतन करा
   ↓
साठा कमी करा
```

---

# Search

Search using:

```text
Marathi name
Barcode
SKU
```

---

# Payment

Initial methods:

```text
रोख
UPI
कार्ड
उधारी
```

Database values:

```text
CASH
UPI
CARD
CREDIT
```

---

# Billing Calculation

Calculate:

```text
Subtotal
Discount
GST
Grand Total
```

Do calculations in the backend.

Do not trust frontend calculations for the final invoice.

---

# Invoice Creation

Backend must:

1. Validate products.
2. Check stock.
3. Get current selling price.
4. Calculate totals.
5. Calculate GST.
6. Create invoice.
7. Create invoice items.
8. Decrease stock.
9. Create stock movement.
10. Commit transaction.

All operations must use one database transaction.

If billing fails:

```text
ROLLBACK
```

Stock must remain unchanged.

---

# Stock

Example:

```text
Current stock = 100

Sale = 2

New stock = 98
```

Do not allow normal sales to create negative stock.

---

# Invoice Number

Use sequential numbers:

```text
INV-000001
INV-000002
INV-000003
```

Never reuse an invoice number.

---

# Important

Invoice items must store the actual price used during billing.

If product price changes later, the old invoice must not change.

---

# Definition of Done

* Product can be searched.
* Product can be added to cart.
* Quantity can be changed.
* Discount works.
* GST works.
* Payment works.
* Invoice is saved.
* Stock decreases.
* Invoice number is generated.
* Failed billing rolls back.
* Old invoice data is preserved.

STOP HERE.
