# Phase 07 — Admin Price Management

## Goal

Allow only Admin to change product selling prices.

---

# Example

Current product:

```text
टाटा मीठ १ किलो

Selling Price: ₹28
```

Admin changes:

```text
₹28 → ₹32
```

New bills must use:

```text
₹32
```

Old bills must continue showing:

```text
₹28
```

---

# API

Create:

```text
PUT /products/{id}/price
```

Only ADMIN can call this endpoint.

Cashier must receive:

```text
403 Forbidden
```

---

# Price History

Every change must record:

```text
Product
Old Price
New Price
Admin
Reason
Date/Time
```

Example:

```text
टाटा मीठ १ किलो

₹28 → ₹32

बदलले: Admin
कारण: पुरवठादाराची किंमत वाढली
```

---

# Price Update Transaction

When changing price:

1. Read current price.
2. Save old price.
3. Update new price.
4. Create price-history record.
5. Commit.

If anything fails:

```text
ROLLBACK
```

---

# UI

Admin product page should show:

```text
सध्याची विक्री किंमत
₹28

नवीन विक्री किंमत
[ ₹32 ]

बदलण्याचे कारण
[ पुरवठादाराची किंमत वाढली ]

[ किंमत बदला ]
```

Cashier should not see an editable price field.

However, backend authorization remains mandatory.

---

# Definition of Done

* Admin can change price.
* Cashier cannot change price.
* Price history is recorded.
* New bills use new price.
* Old bills retain old price.
* Reason is recorded.

STOP HERE.
