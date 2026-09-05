import re
from datetime import datetime, timedelta
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, require_role, verify_password
from app.database import SessionLocal, backfill_product_units, ensure_schema_upgrades, init_db
from app.transliteration import devanagari_to_roman, transliterate_text
from app.units import map_legacy_unit, product_unit_display
from app.models import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    PaymentMethod,
    Product,
    ProductPriceHistory,
    StockMovement,
    StockMovementType,
    User,
    UserRole,
)

app = FastAPI(title='Store POS API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class ProductCreateRequest(BaseModel):
    name_mr: str = Field(..., min_length=1)
    barcode: str | None = None
    sku: str | None = None
    category_mr: str | None = None
    unit: str | None = None
    unit_type: str | None = None
    pack_quantity: float | None = Field(None, gt=0)
    purchase_price: float | None = None
    selling_price: float | None = None
    mrp: float | None = None
    gst_rate: float | None = None
    current_stock: int = 0
    low_stock_level: int = 0


class ProductUpdateRequest(BaseModel):
    name_mr: str | None = None
    barcode: str | None = None
    sku: str | None = None
    category_mr: str | None = None
    unit: str | None = None
    unit_type: str | None = None
    pack_quantity: float | None = Field(None, gt=0)
    purchase_price: float | None = None
    selling_price: float | None = None
    mrp: float | None = None
    gst_rate: float | None = None
    current_stock: int | None = None
    low_stock_level: int | None = None
    is_active: bool | None = None


class BillingItemRequest(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    discount: float = 0.0


class BillingRequest(BaseModel):
    payment_method: str
    discount: float = 0.0
    items: list[BillingItemRequest]


class ProductPriceUpdateRequest(BaseModel):
    new_price: float = Field(..., gt=0)
    reason: str | None = None


class CashierCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


def normalize_barcode(value: str | None) -> str | None:
    if value is None:
        return None

    barcode = str(value).strip()
    if not barcode:
        return None

    if any(ch.isspace() for ch in barcode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोडमध्ये स्पेस असू शकत नाही.')

    if not re.fullmatch(r'[A-Za-z0-9_-]+', barcode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोडमध्ये फक्त अक्षर, संख्या, _ आणि - वापरता येतात.')

    return barcode


def validate_barcode_unique(db: Session, barcode: str | None, exclude_id: int | None = None) -> None:
    if barcode is None:
        return

    existing = db.query(Product).filter(Product.barcode == barcode)
    if exclude_id is not None:
        existing = existing.filter(Product.id != exclude_id)

    if existing.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='हा बारकोड आधीच दुसऱ्या उत्पादनासाठी वापरला आहे.',
        )


def serialize_product(product: Product) -> dict[str, Any]:
    legacy_unit = product.unit
    return {
        'id': product.id,
        'name_mr': product.name_mr,
        'barcode': product.barcode,
        'sku': product.sku,
        'category_mr': product.category_mr,
        'unit': legacy_unit,
        'unit_type': product.unit_type,
        'pack_quantity': float(product.pack_quantity) if product.pack_quantity is not None else None,
        'unit_display': product_unit_display(product.unit_type, product.pack_quantity, legacy_unit),
        'purchase_price': float(product.purchase_price) if product.purchase_price is not None else None,
        'selling_price': float(product.selling_price) if product.selling_price is not None else None,
        'mrp': float(product.mrp) if product.mrp is not None else None,
        'gst_rate': float(product.gst_rate) if product.gst_rate is not None else None,
        'current_stock': product.current_stock,
        'low_stock_level': product.low_stock_level,
        'is_active': product.is_active,
        'created_at': product.created_at.isoformat() if product.created_at is not None else None,
    }


def seed_users() -> None:
    db: Session = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.username == 'admin').first()
        if existing_admin is None:
            db.add(
                User(
                    name='Administrator',
                    username='admin',
                    password_hash=hash_password('admin123'),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
            )

        existing_cashier = db.query(User).filter(User.username == 'cashier').first()
        if existing_cashier is None:
            db.add(
                User(
                    name='Cashier',
                    username='cashier',
                    password_hash=hash_password('cashier123'),
                    role=UserRole.CASHIER,
                    is_active=True,
                )
            )

        db.commit()
    finally:
        db.close()


def seed_demo_data() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(Product).count() > 0:
            return

        demo_products = [
            {
                'name_mr': 'तांदूळ',
                'barcode': 'BAR-1001',
                'sku': 'SKU-1001',
                'category_mr': 'धान्य',
                'unit_type': 'किलो',
                'pack_quantity': 1,
                'purchase_price': 32,
                'selling_price': 38,
                'mrp': 42,
                'gst_rate': 5,
                'current_stock': 25,
                'low_stock_level': 5,
            },
            {
                'name_mr': 'कापूस तेल',
                'barcode': 'BAR-1002',
                'sku': 'SKU-1002',
                'category_mr': 'तेल',
                'unit_type': 'लिटर',
                'pack_quantity': 1,
                'purchase_price': 120,
                'selling_price': 145,
                'mrp': 160,
                'gst_rate': 5,
                'current_stock': 18,
                'low_stock_level': 4,
            },
            {
                'name_mr': 'टाटा मीठ',
                'barcode': 'BAR-1003',
                'sku': 'SKU-1003',
                'category_mr': 'मसाला',
                'unit_type': 'किलो',
                'pack_quantity': 1,
                'purchase_price': 20,
                'selling_price': 28,
                'mrp': 30,
                'gst_rate': 5,
                'current_stock': 40,
                'low_stock_level': 8,
            },
            {
                'name_mr': 'कांदा',
                'barcode': 'BAR-1004',
                'sku': 'SKU-1004',
                'category_mr': 'भाज्या',
                'unit_type': 'किलो',
                'pack_quantity': 1,
                'purchase_price': 18,
                'selling_price': 24,
                'mrp': 26,
                'gst_rate': 5,
                'current_stock': 30,
                'low_stock_level': 6,
            },
        ]

        for item in demo_products:
            legacy_unit = product_unit_display(item.get('unit_type'), item.get('pack_quantity'), None)
            db.add(
                Product(
                    **{**item, 'unit': legacy_unit},
                    is_active=True,
                    created_at=datetime.utcnow() - timedelta(days=30),
                )
            )

        db.flush()

        admin = db.query(User).filter(User.username == 'admin').first()
        if admin is not None and db.query(Invoice).count() == 0:
            product = db.query(Product).filter(Product.barcode == 'BAR-1003').first()
            invoice = Invoice(
                invoice_number='INV-000001',
                invoice_date=datetime.utcnow(),
                subtotal=56.0,
                discount=0.0,
                tax_amount=2.8,
                grand_total=58.8,
                payment_method=PaymentMethod.CASH,
                status=InvoiceStatus.COMPLETED,
                created_by=admin.id,
                created_at=datetime.utcnow(),
            )
            db.add(invoice)
            db.flush()
            if product is not None:
                db.add(
                    InvoiceItem(
                        invoice_id=invoice.id,
                        product_id=product.id,
                        product_name_mr=product.name_mr,
                        quantity=2,
                        unit_price=product.selling_price,
                        discount=0.0,
                        gst_rate=product.gst_rate,
                        tax_amount=2.8,
                        total=56.0,
                    )
                )

        db.commit()
    finally:
        db.close()


init_db()
ensure_schema_upgrades()
backfill_product_units()
seed_users()
seed_demo_data()


@app.on_event('startup')
def startup() -> None:
    init_db()
    ensure_schema_upgrades()
    backfill_product_units()
    seed_users()
    seed_demo_data()


@app.post('/auth/login')
def login(payload: LoginRequest) -> dict[str, str]:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.username == payload.username).first()
    finally:
        db.close()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    token = create_access_token(user.username, user.role.value)
    return {'access_token': token, 'token_type': 'bearer'}


@app.get('/admin/users')
def admin_users(user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, str]:
    return {'message': f'Admin access granted for {user.username}'}


@app.post('/admin/users')
def create_cashier(payload: CashierCreateRequest, user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        name = payload.name.strip()
        username = payload.username.strip()
        password = payload.password

        if not name or not username or not password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid cashier details')

        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Username already exists')

        cashier = User(
            name=name,
            username=username,
            password_hash=hash_password(password),
            role=UserRole.CASHIER,
            is_active=True,
        )
        db.add(cashier)
        db.commit()
        db.refresh(cashier)
        result = {
            'id': cashier.id,
            'name': cashier.name,
            'username': cashier.username,
            'role': cashier.role.value,
            'is_active': cashier.is_active,
        }
    except HTTPException:
        db.rollback()
        raise
    finally:
        db.close()
    return result


@app.get('/profile')
def profile(user: User = Depends(get_current_user)) -> dict[str, str]:
    return {'username': user.username, 'role': user.role.value}


@app.get('/products')
def list_products(user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        products = db.query(Product).filter(Product.is_active.is_(True)).all()
        result = [serialize_product(product) for product in products]
    finally:
        db.close()
    return result


@app.get('/products/frequent')
def list_frequent_products(
    limit: int = Query(6, ge=1, le=20),
    user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        rows = (
            db.query(Product, func.count(InvoiceItem.id).label('frequency'))
            .join(InvoiceItem, InvoiceItem.product_id == Product.id)
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .filter(Product.is_active.is_(True))
            .filter(Invoice.status == InvoiceStatus.COMPLETED)
            .group_by(Product.id)
            .order_by(func.count(InvoiceItem.id).desc(), Product.name_mr.asc())
            .limit(limit)
            .all()
        )
        result = [
            {
                **serialize_product(product),
                'frequency': int(frequency or 0),
            }
            for product, frequency in rows
        ]
    finally:
        db.close()
    return result


def serialize_invoice_summary(invoice: Invoice) -> dict[str, Any]:
    creator_name = invoice.creator.name if invoice.creator else 'Unknown'
    creator_username = invoice.creator.username if invoice.creator else 'unknown'
    return {
        'id': invoice.id,
        'invoice_number': invoice.invoice_number,
        'date': invoice.invoice_date.isoformat(),
        'subtotal': float(invoice.subtotal),
        'discount': float(invoice.discount),
        'tax_amount': float(invoice.tax_amount),
        'amount': float(invoice.grand_total),
        'grand_total': float(invoice.grand_total),
        'payment_method': invoice.payment_method.value,
        'status': invoice.status.value,
        'created_by': invoice.created_by,
        'created_by_name': creator_name,
        'created_by_username': creator_username,
        'items_count': len(invoice.invoice_items) if invoice.invoice_items else 0,
    }


def serialize_invoice_detail(invoice: Invoice) -> dict[str, Any]:
    summary = serialize_invoice_summary(invoice)
    summary['items'] = [
        {
            'id': item.id,
            'product_id': item.product_id,
            'product_name_mr': item.product_name_mr,
            'unit_display': product_unit_display(
                item.product.unit_type if item.product else None,
                item.product.pack_quantity if item.product else None,
                item.product.unit if item.product else None,
            ),
            'quantity': float(item.quantity),
            'unit_price': float(item.unit_price),
            'discount': float(item.discount),
            'gst_rate': float(item.gst_rate) if item.gst_rate is not None else 0.0,
            'tax_amount': float(item.tax_amount) if item.tax_amount is not None else 0.0,
            'total': float(item.total),
        }
        for item in invoice.invoice_items
    ]
    return summary


@app.get('/invoices')
def list_invoices(
    search: str | None = Query(None),
    date_filter: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    user: User = Depends(get_current_user),
) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        q = db.query(Invoice)

        if search:
            clean_search = search.strip()
            q = q.filter(Invoice.invoice_number.like(f'%{clean_search}%'))

        now = datetime.utcnow()
        if date_filter == 'today':
            today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
            today_end = datetime(now.year, now.month, now.day, 23, 59, 59)
            q = q.filter(Invoice.invoice_date >= today_start, Invoice.invoice_date <= today_end)
        else:
            if start_date:
                try:
                    s_dt = datetime.strptime(start_date.strip(), '%Y-%m-%d')
                    q = q.filter(Invoice.invoice_date >= s_dt)
                except ValueError:
                    pass
            if end_date:
                try:
                    e_dt = datetime.strptime(end_date.strip(), '%Y-%m-%d')
                    e_dt = datetime(e_dt.year, e_dt.month, e_dt.day, 23, 59, 59)
                    q = q.filter(Invoice.invoice_date <= e_dt)
                except ValueError:
                    pass

        invoices = q.order_by(Invoice.created_at.desc()).all()
        result = [serialize_invoice_summary(invoice) for invoice in invoices]
    finally:
        db.close()
    return result


@app.get('/invoices/{invoice_id}')
def get_invoice(invoice_id: int, user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Invoice not found')
        result = serialize_invoice_detail(invoice)
    finally:
        db.close()
    return result


@app.post('/invoices/{invoice_id}/cancel')
def cancel_invoice(
    invoice_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Invoice not found')

        if invoice.status == InvoiceStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invoice is already cancelled',
            )

        # 1. Update invoice status to CANCELLED
        invoice.status = InvoiceStatus.CANCELLED

        # 2. Restore stock and record RETURN stock movement for each item
        for item in invoice.invoice_items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product is not None:
                product.current_stock = int(product.current_stock) + int(item.quantity)

            return_movement = StockMovement(
                product_id=item.product_id,
                type=StockMovementType.RETURN,
                quantity=float(item.quantity),
                reference_id=invoice.invoice_number,
                created_at=datetime.utcnow(),
            )
            db.add(return_movement)

        db.commit()
        db.refresh(invoice)
        result = serialize_invoice_detail(invoice)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Failed to cancel invoice',
        ) from exc
    finally:
        db.close()
    return result


@app.get('/bills')
def list_bills(user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return list_invoices(user=user)


@app.get('/products/search')
def search_products(query: str = Query(..., min_length=1), user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        clean_query = query.strip()
        transliterated = transliterate_text(clean_query)
        q_lower = clean_query.lower()

        products = db.query(Product).filter(Product.is_active.is_(True)).all()
        matched: list[Product] = []
        for product in products:
            barcode = (product.barcode or '').lower()
            sku = (product.sku or '').lower()
            name_mr = product.name_mr or ''
            cat_mr = product.category_mr or ''
            name_roman = devanagari_to_roman(name_mr)
            cat_roman = devanagari_to_roman(cat_mr)

            if (
                q_lower in barcode
                or q_lower in sku
                or clean_query.lower() in name_mr.lower()
                or clean_query.lower() in cat_mr.lower()
                or (transliterated and transliterated in name_mr)
                or (transliterated and transliterated in cat_mr)
                or q_lower in name_roman
                or q_lower in cat_roman
            ):
                matched.append(product)

        result = [serialize_product(product) for product in matched]
    finally:
        db.close()
    return result


@app.get('/products/{product_id}')
def get_product(product_id: int, user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id, Product.is_active.is_(True)).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found')
        result = serialize_product(product)
    finally:
        db.close()
    return result


@app.get('/products/barcode/{barcode}')
def get_product_by_barcode(barcode: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        normalized = normalize_barcode(barcode)
        if normalized is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोड आवश्यक आहे.')

        product = db.query(Product).filter(Product.barcode == normalized, Product.is_active.is_(True)).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found by barcode')
        result = serialize_product(product)
    finally:
        db.close()
    return result


@app.post('/products/barcode/generate')
def generate_product_barcode(user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, str]:
    db: Session = SessionLocal()
    try:
        existing = {product.barcode for product in db.query(Product).all() if product.barcode}
        candidate = None
        for offset in range(1, 100000):
            candidate = str(8900000000000 + offset)
            if candidate not in existing:
                break
        if candidate is None or candidate in existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोड तयार करण्यात अयशस्वी.')

        normalized = normalize_barcode(candidate)
        if normalized is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Generated barcode invalid.')

        return {'barcode': normalized}
    finally:
        db.close()


@app.post('/products')
def create_product(payload: ProductCreateRequest, user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        sanitized_barcode = normalize_barcode(payload.barcode)
        validate_barcode_unique(db, sanitized_barcode)

        unit_type = payload.unit_type
        pack_quantity = payload.pack_quantity
        legacy_unit = payload.unit
        if unit_type is None and pack_quantity is None and legacy_unit is None:
            unit_type, pack_quantity = map_legacy_unit(None)
        elif unit_type is None or pack_quantity is None:
            mapped_type, mapped_qty = map_legacy_unit(legacy_unit)
            unit_type = unit_type if unit_type is not None else mapped_type
            pack_quantity = pack_quantity if pack_quantity is not None else mapped_qty
        unit_display = product_unit_display(unit_type, pack_quantity, legacy_unit)

        product = Product(
            name_mr=payload.name_mr,
            barcode=sanitized_barcode,
            sku=payload.sku,
            category_mr=payload.category_mr,
            unit=unit_display or legacy_unit,
            unit_type=unit_type,
            pack_quantity=pack_quantity,
            purchase_price=payload.purchase_price,
            selling_price=payload.selling_price,
            mrp=payload.mrp,
            gst_rate=payload.gst_rate,
            current_stock=payload.current_stock,
            low_stock_level=payload.low_stock_level,
            is_active=True,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        result = serialize_product(product)
    except HTTPException:
        db.rollback()
        raise
    finally:
        db.close()
    return result


@app.put('/products/{product_id}')
def update_product(product_id: int, payload: ProductUpdateRequest, user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found')

        payload_fields = payload.model_dump(exclude_unset=True)
        for field, value in payload_fields.items():
            if value is None:
                continue
            if field == 'barcode':
                value = normalize_barcode(value)
                validate_barcode_unique(db, value, exclude_id=product.id)
            setattr(product, field, value)

        if 'unit_type' in payload_fields or 'pack_quantity' in payload_fields:
            unit_display = product_unit_display(product.unit_type, product.pack_quantity, product.unit)
            if unit_display is not None:
                product.unit = unit_display

        db.commit()
        db.refresh(product)
        result = serialize_product(product)
    except HTTPException:
        db.rollback()
        raise
    finally:
        db.close()
    return result


@app.put('/products/{product_id}/price')
def update_product_price(
    product_id: int,
    payload: ProductPriceUpdateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Product not found')

        old_price = float(product.selling_price) if product.selling_price is not None else None
        new_price = float(payload.new_price)

        product.selling_price = new_price
        history = ProductPriceHistory(
            product_id=product.id,
            old_price=old_price,
            new_price=new_price,
            changed_by=user.id,
            reason=payload.reason,
            changed_at=datetime.utcnow(),
        )
        db.add(history)
        db.commit()
        db.refresh(product)
        result = {
            'id': product.id,
            'old_price': old_price,
            'new_price': new_price,
            'reason': payload.reason,
            'changed_by': user.username,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Price update failed') from exc
    finally:
        db.close()
    return result


@app.post('/bills')
def create_bill(payload: BillingRequest, user: User = Depends(get_current_user)) -> dict[str, Any]:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invoice requires at least one item')

    db: Session = SessionLocal()
    try:
        subtotal = 0.0
        total_discount = 0.0
        stock_after_sale = None

        bill_items: list[dict[str, Any]] = []
        for item in payload.items:
            product = db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first()
            if product is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Product not found: {item.product_id}')
            if float(product.current_stock) < float(item.quantity):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Insufficient stock')

            unit_price = float(product.selling_price) if product.selling_price is not None else 0.0
            line_total = unit_price * float(item.quantity)
            line_discount = float(item.discount)
            total_discount += line_discount
            subtotal += max(line_total - line_discount, 0.0)
            bill_items.append(
                {
                    'product': product,
                    'quantity': float(item.quantity),
                    'discount': line_discount,
                    'unit_price': unit_price,
                    'line_total': max(line_total - line_discount, 0.0),
                }
            )

        requested_discount = float(payload.discount)
        grand_total = round(subtotal - requested_discount, 2)
        if grand_total < 0:
            grand_total = 0.0

        latest_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
        sequence = int((latest_invoice.id if latest_invoice else 0)) + 1
        invoice_number = f'INV-{sequence:06d}'

        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_date=datetime.utcnow(),
            subtotal=subtotal,
            discount=requested_discount,
            tax_amount=0.0,
            grand_total=grand_total,
            payment_method=PaymentMethod(payload.payment_method.upper()),
            status=InvoiceStatus.COMPLETED,
            created_by=user.id,
            created_at=datetime.utcnow(),
        )
        db.add(invoice)
        db.flush()

        for item in bill_items:
            product = item['product']
            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                product_name_mr=product.name_mr,
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                discount=item['discount'],
                gst_rate=product.gst_rate,
                tax_amount=0.0,
                total=item['line_total'],
            )
            db.add(invoice_item)
            product.current_stock = int(product.current_stock) - int(item['quantity'])
            db.add(
                StockMovement(
                    product_id=product.id,
                    type=StockMovementType.SALE,
                    quantity=-float(item['quantity']),
                    reference_id=invoice.invoice_number,
                    created_at=datetime.utcnow(),
                )
            )
            stock_after_sale = product.current_stock

        db.commit()
        db.refresh(invoice)
        response = {
            'invoice_number': invoice.invoice_number,
            'subtotal': float(invoice.subtotal),
            'discount': float(invoice.discount),
            'tax_amount': float(invoice.tax_amount),
            'grand_total': float(invoice.grand_total),
            'payment_method': invoice.payment_method.value,
            'status': invoice.status.value,
            'stock_after_sale': stock_after_sale if stock_after_sale is not None else 0,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Billing failed') from exc
    finally:
        db.close()

    return response


@app.get('/')
def read_root() -> dict[str, str]:
    return {'message': 'Store POS API running'}
