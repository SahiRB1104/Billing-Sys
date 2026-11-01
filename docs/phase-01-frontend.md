# Phase 01 — Frontend Foundation

## Goal

Create only the basic frontend.

Do NOT create the backend, database, authentication, or real billing logic in this phase.

---

## Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* react-i18next
* React Router

Install only what is required.

Do not add a component library.

Do not add Redux.

Do not add unnecessary packages.

---

# 1. Create Frontend

Create:

```text
frontend/
```

Use React + TypeScript + Vite.

---

# 2. Basic Layout

Create a simple desktop layout.

Navigation:

```text
बिलिंग
उत्पाद
बिले
सेटिंग
```

The UI must be simple and classic.

Do not create:

* fancy dashboard
* animations
* gradients
* charts
* glassmorphism
* excessive icons
* complex cards

---

# 3. Marathi Default

Default language:

```text
मराठी
```

Language switch:

```text
मराठी | English
```

Use react-i18next.

Create:

```text
src/i18n/
├── mr.json
└── en.json
```

All UI text must use translations.

Do not hard-code UI text.

---

# 4. Product Entry Language

Product entry is Marathi-first.

Example:

```text
उत्पादनाचे नाव *
[ टाटा मीठ १ किलो ]

बारकोड
[ 8901030... ]

विक्री किंमत
[ 32 ]

MRP
[ 35 ]

GST
[ 5% ]

साठा
[ 100 ]
```

Do NOT require an English product name.

Do NOT create:

```text
Product Name English *
```

Product name should be:

```text
name_mr
```

---

# 5. Product Screen

Create a simple placeholder/product-entry UI.

Fields:

```text
उत्पादनाचे नाव
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

No backend functionality yet.

---

# 6. Billing Screen

Create only the frontend layout.

Example:

```text
------------------------------------------------
| नवीन बिल                                    |
------------------------------------------------
| बारकोड / उत्पादन शोध                       |
| [________________________________]           |
------------------------------------------------
| उत्पादन | प्रमाण | किंमत | GST | रक्कम      |
------------------------------------------------
| टाटा मीठ १ किलो | 2 | 32 | 5% | 64         |
------------------------------------------------

एकूण
सूट
GST

एकूण रक्कम

[ रोख ] [ UPI ] [ कार्ड ] [ उधारी ]

[ जतन करा आणि प्रिंट करा ]
```

Static data is acceptable for this phase.

---

# 7. Bills Screen

Create a simple table:

```text
बिल क्रमांक
तारीख
रक्कम
पेमेंट
```

---

# 8. Settings Screen

Create basic placeholder:

```text
दुकानाचे नाव
पत्ता
फोन
GSTIN
प्रिंटर
बिलचा संदेश
भाषा
```

---

# Definition of Done

Phase 1 is complete when:

* React frontend runs.
* Marathi is default.
* English toggle works.
* Navigation works.
* Billing page exists.
* Product page exists.
* Bills page exists.
* Settings page exists.
* UI is simple.
* No backend exists yet.
* No database exists yet.

STOP HERE.

Do not start Phase 2 automatically.
