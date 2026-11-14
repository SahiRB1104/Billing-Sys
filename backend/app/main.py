from __future__ import annotations

import base64
import csv
import io
import random
import re
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, require_role, verify_password
from app.database import BACKEND_DIR, SessionLocal, backfill_product_units, ensure_schema_upgrades, init_db, seed_default_settings, settings, get_resolved_database_url
from app.transliteration import devanagari_to_roman, transliterate_text
from app.units import map_legacy_unit, product_unit_display
from app.models import (
    AuditEvent,
    CreditSettlement,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    PaymentMethod,
    PaymentSettings,
    Product,
    ProductPriceHistory,
    StaffDocument,
    StockMovement,
    StockMovementType,
    StoreSettings,
    User,
    UserRole,
    utcnow,
)

app = FastAPI(title='Store POS API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def round_cur(val: float | int | Decimal | None) -> float:
    if val is None:
        return 0.0
    d = Decimal(str(val)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return float(d)


# ── Pydantic Request Models ──────────────────────────────────────────


class LoginRequest(BaseModel):
    username: str
    password: str


class StoreSettingsUpdateRequest(BaseModel):
    store_name: str = Field(..., min_length=1)
    owner_name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pin_code: str | None = None
    country: str | None = 'भारत'
    phone: str | None = None
    email: str | None = None
    gst_enabled: bool = False
    gstin: str | None = None
    business_logo: str | None = None
    invoice_prefix: str = 'INV'
    currency_symbol: str = '₹'
    locale: str = 'mr-IN'
    receipt_header: str | None = None
    receipt_footer: str | None = None
    tax_inclusive: bool = True
    default_gst_rate: float | None = 5.0


class PaymentSettingsUpdateRequest(BaseModel):
    upi_enabled: bool = True
    payee_name: str | None = None
    upi_id: str | None = None
    payment_description: str | None = None
    static_qr_image: str | None = None
    gateway_enabled: bool = False
    gateway_provider: str | None = 'MANUAL'


class DocumentUploadRequest(BaseModel):
    original_name: str
    mime_type: str
    document_data: str  # Base64 data URL


class StaffCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    role: str = 'CASHIER'
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None
    staff_id: str | None = None
    joining_date: str | None = None
    document_type: str | None = None
    document_ref: str | None = None
    document_status: str | None = 'PENDING'
    document_notes: str | None = None
    hard_copy_collected: bool = False
    document_file: DocumentUploadRequest | None = None


class StaffUpdateRequest(BaseModel):
    name: str | None = None
    contact_number: str | None = None
    email: str | None = None
    address: str | None = None
    staff_id: str | None = None
    joining_date: str | None = None
    document_type: str | None = None
    document_ref: str | None = None
    document_status: str | None = None
    document_notes: str | None = None
    hard_copy_collected: bool | None = None
    is_active: bool | None = None


class StaffPasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=4)
    otp_code: str | None = None


class FirstLoginPasswordChangeRequest(BaseModel):
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)


class InvoiceReturnItemRequest(BaseModel):
    invoice_item_id: int
    return_quantity: float = Field(..., gt=0)


class InvoiceReturnRequest(BaseModel):
    items: list[InvoiceReturnItemRequest]
    reason: str | None = None


class CreditSettleRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_mode: str = 'CASH'
    reference_note: str | None = None
    note: str | None = None


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
    customer_name: str | None = None
    customer_phone: str | None = None
    payment_reference: str | None = None
    cash_tendered: float | None = None
    change_returned: float | None = None
    initial_paid_amount: float | None = 0.0
    initial_payment_mode: str | None = 'CASH'
    notes: str | None = None
    idempotency_key: str | None = None


class ProductPriceUpdateRequest(BaseModel):
    new_price: float = Field(..., gt=0)
    reason: str | None = None


class CashierCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


# ── In-Memory Idempotency Store for Sales ────────────────────────────
RECENT_IDEMPOTENCY_KEYS: dict[str, dict[str, Any]] = {}


def log_audit(
    db: Session,
    action: str,
    user_id: int | None = None,
    details: str | None = None,
    ip: str | None = None,
) -> None:
    try:
        event = AuditEvent(
            action=action,
            performed_by=user_id,
            details=details,
            ip_address=ip,
            created_at=utcnow(),
        )
        db.add(event)
        db.flush()
    except Exception as exc:
        print(f'[audit-log-error] {exc}')


def normalize_barcode(value: str | None) -> str | None:
    if value is None:
        return None

    barcode = str(value).strip()
    if not barcode:
        return None

    if any(ch.isspace() for ch in barcode):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोडमध्ये स्पेस असू शकत नाही.')

    if not re.fullmatch(r'[A-Za-z0-9_-]+', barcode):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='बारकोडमध्ये फक्त अक्षर, संख्या, _ आणि - वापरता येतात.',
        )

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


def serialize_staff_user(u: User) -> dict[str, Any]:
    return {
        'id': u.id,
        'name': u.name,
        'username': u.username,
        'role': u.role.value,
        'is_active': u.is_active,
        'contact_number': u.contact_number,
        'email': u.email,
        'address': u.address,
        'staff_id': u.staff_id,
        'joining_date': u.joining_date,
        'document_type': u.document_type,
        'document_ref': u.document_ref,
        'document_status': u.document_status or 'PENDING',
        'document_notes': u.document_notes,
        'document_submitted_at': u.document_submitted_at.isoformat() if u.document_submitted_at else None,
        'hard_copy_collected': bool(getattr(u, 'hard_copy_collected', False)),
        'must_change_password': bool(getattr(u, 'must_change_password', False)),
        'documents_count': len(u.documents) if u.documents else 0,
        'created_at': u.created_at.isoformat() if u.created_at else None,
        'updated_at': u.updated_at.isoformat() if u.updated_at else None,
    }


def compute_next_employee_code(db: Session, role: str = 'CASHIER') -> str:
    prefix = 'ADM' if role.upper() == 'ADMIN' else 'EMP'
    users = db.query(User).all()
    existing_codes = {(u.staff_id or '').strip().upper() for u in users if u.staff_id}
    max_num = 0
    for u in users:
        code = (u.staff_id or '').strip().upper()
        match = re.match(rf'^(?:{prefix}|EMP|CSH)-(\d+)$', code)
        if match:
            max_num = max(max_num, int(match.group(1)))
    if prefix == 'EMP' and max_num == 0:
        cashier_count = sum(1 for u in users if u.role == UserRole.CASHIER)
        max_num = cashier_count
    next_num = max_num + 1
    candidate = f'{prefix}-{next_num:03d}'
    while candidate.upper() in existing_codes:
        next_num += 1
        candidate = f'{prefix}-{next_num:03d}'
    return candidate


def validate_indian_mobile_and_kyc(
    contact_number: str | None,
    document_type: str | None,
    document_ref: str | None,
    require_all: bool = False,
) -> tuple[str | None, str | None]:
    clean_phone = None
    if contact_number:
        digits = re.sub(r'\D', '', contact_number)
        if digits.startswith('91') and len(digits) == 12:
            digits = digits[2:]
        if not re.fullmatch(r'[6-9]\d{9}', digits):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid mobile number. Enter a valid 10-digit Indian mobile number starting with 6-9.',
            )
        clean_phone = digits
    elif require_all:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='10-digit mobile number is required.',
        )

    clean_doc_ref = None
    if document_ref:
        doc_t = (document_type or 'Aadhar').strip()
        raw_ref = document_ref.strip().upper()
        if doc_t in ('Aadhar', 'Aadhaar'):
            aadhaar_digits = re.sub(r'\D', '', raw_ref)
            if len(aadhaar_digits) != 12:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Aadhaar number must be exactly 12 digits (XXXX-XXXX-XXXX).',
                )
            clean_doc_ref = f'{aadhaar_digits[:4]}-{aadhaar_digits[4:8]}-{aadhaar_digits[8:12]}'
        elif doc_t == 'PAN':
            pan_clean = re.sub(r'[^A-Z0-9]', '', raw_ref)
            if not re.fullmatch(r'[A-Z]{5}[0-9]{4}[A-Z]{1}', pan_clean):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F).',
                )
            clean_doc_ref = pan_clean
        elif doc_t == 'Voter ID':
            voter_clean = re.sub(r'[^A-Z0-9]', '', raw_ref)
            if not re.fullmatch(r'[A-Z]{3}[0-9]{7}', voter_clean):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Invalid Voter ID (EPIC). Must be 3 letters followed by 7 digits (e.g. ABC1234567).',
                )
            clean_doc_ref = voter_clean
        elif doc_t == 'Driving License':
            dl_clean = re.sub(r'[^A-Z0-9]', '', raw_ref)
            if not re.fullmatch(r'[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}', dl_clean) and not (13 <= len(dl_clean) <= 16):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Invalid Indian Driving License number (e.g. MH-13-20180012345).',
                )
            if len(dl_clean) == 15:
                clean_doc_ref = f'{dl_clean[:2]}-{dl_clean[2:4]}-{dl_clean[4:]}'
            else:
                clean_doc_ref = raw_ref
        else:
            clean_doc_ref = raw_ref
    elif require_all:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Identity document number is required.',
        )

    return clean_phone, clean_doc_ref


def save_staff_document_to_disk_and_db(
    db: Session,
    staff: User,
    doc_payload: DocumentUploadRequest,
) -> StaffDocument:
    allowed_mimes = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'}
    if doc_payload.mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Only PDF, JPEG, PNG, or WEBP files under 1MB are accepted.',
        )

    data_len = len(doc_payload.document_data)
    # 1MB binary is ~1.37MB base64
    if data_len > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='File size must be under 1MB.',
        )

    safe_orig = re.sub(r'[^A-Za-z0-9._-]', '_', doc_payload.original_name or 'document')
    doc_filename = f'{staff.id}_{uuid.uuid4().hex[:10]}_{safe_orig}'

    try:
        docs_dir = BACKEND_DIR / 'data' / 'staff_docs'
        docs_dir.mkdir(parents=True, exist_ok=True)
        raw_b64 = doc_payload.document_data.split(',', 1)[-1]
        binary_bytes = base64.b64decode(raw_b64)
        if len(binary_bytes) > 1 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='File size must be under 1MB.',
            )
        (docs_dir / doc_filename).write_bytes(binary_bytes)
        file_byte_size = len(binary_bytes)
    except HTTPException:
        raise
    except Exception:
        file_byte_size = data_len

    doc = StaffDocument(
        user_id=staff.id,
        filename=doc_filename,
        original_name=doc_payload.original_name,
        mime_type=doc_payload.mime_type,
        file_size=file_byte_size,
        document_data=doc_payload.document_data,
        uploaded_at=utcnow(),
    )
    db.add(doc)
    staff.document_status = 'VERIFIED' if staff.hard_copy_collected else 'SUBMITTED'
    staff.document_submitted_at = utcnow()
    return doc


def serialize_store_settings(s: StoreSettings) -> dict[str, Any]:
    return {
        'id': s.id,
        'store_name': s.store_name,
        'owner_name': s.owner_name,
        'address': s.address,
        'city': s.city,
        'state': s.state,
        'pin_code': s.pin_code,
        'country': s.country,
        'phone': s.phone,
        'email': s.email,
        'gst_enabled': s.gst_enabled,
        'gstin': s.gstin,
        'business_logo': s.business_logo,
        'invoice_prefix': s.invoice_prefix,
        'currency_symbol': s.currency_symbol,
        'locale': s.locale,
        'receipt_header': s.receipt_header,
        'receipt_footer': s.receipt_footer,
        'tax_inclusive': s.tax_inclusive,
        'default_gst_rate': float(s.default_gst_rate) if s.default_gst_rate is not None else 5.0,
        'updated_at': s.updated_at.isoformat() if s.updated_at else None,
    }


def serialize_payment_settings(p: PaymentSettings, is_admin: bool = False) -> dict[str, Any]:
    data = {
        'id': p.id,
        'upi_enabled': p.upi_enabled,
        'payee_name': p.payee_name,
        'upi_id': p.upi_id,
        'payment_description': p.payment_description,
        'has_static_qr': bool(p.static_qr_image),
        'gateway_enabled': p.gateway_enabled,
        'gateway_provider': p.gateway_provider,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None,
    }
    if is_admin:
        data['static_qr_image'] = p.static_qr_image
    return data


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
                    contact_number='+91 98765 43210',
                    email='admin@billing.local',
                    staff_id='ADM-001',
                    document_type='PAN',
                    document_ref='ABCDE1234F',
                    document_status='VERIFIED',
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
                    contact_number='+91 98765 12345',
                    email='cashier@billing.local',
                    staff_id='CSH-001',
                    document_type='Aadhar',
                    document_ref='XXXX-XXXX-4567',
                    document_status='VERIFIED',
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

        now = utcnow()
        for item in demo_products:
            legacy_unit = product_unit_display(item.get('unit_type'), item.get('pack_quantity'), None)
            db.add(
                Product(
                    **{**item, 'unit': legacy_unit},
                    is_active=True,
                    created_at=now - timedelta(days=30),
                )
            )

        db.flush()

        admin = db.query(User).filter(User.username == 'admin').first()
        if admin is not None and db.query(Invoice).count() == 0:
            product = db.query(Product).filter(Product.barcode == 'BAR-1003').first()
            invoice = Invoice(
                invoice_number='INV-000001',
                invoice_date=now,
                subtotal=56.0,
                discount=0.0,
                tax_amount=2.67,
                taxable_amount=53.33,
                cgst_amount=1.335,
                sgst_amount=1.335,
                grand_total=56.0,
                payment_method=PaymentMethod.CASH,
                status=InvoiceStatus.COMPLETED,
                created_by=admin.id,
                created_at=now,
                customer_name='रमेश शिंदे',
                customer_phone='9822012345',
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
                        tax_amount=2.67,
                        total=56.0,
                    )
                )

        db.commit()
    finally:
        db.close()


init_db()
ensure_schema_upgrades()
seed_default_settings()
backfill_product_units()
seed_users()
seed_demo_data()


# ── Auth Endpoints ───────────────────────────────────────────────────


@app.post('/auth/login')
def login(payload: LoginRequest) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.username == payload.username.strip()).first()
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account is disabled. Please contact the administrator.')

        must_change = bool(getattr(user, 'must_change_password', False))
        token = create_access_token(user.username, user.role.value)
        return {
            'access_token': token,
            'token_type': 'bearer',
            'must_change_password': must_change,
        }
    finally:
        db.close()


@app.get('/profile')
def profile(user: User = Depends(get_current_user)) -> dict[str, Any]:
    return {
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'role': user.role.value,
        'is_active': user.is_active,
        'contact_number': user.contact_number,
        'email': user.email,
        'staff_id': user.staff_id,
        'must_change_password': bool(getattr(user, 'must_change_password', False)),
    }


@app.post('/auth/first-login/send-otp')
def send_first_login_otp(user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        db_user = db.query(User).filter(User.id == user.id).first()
        if db_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

        phone = (db_user.contact_number or '').strip()
        otp = f'{random.randint(100000, 999999)}'
        db_user.otp_code = otp
        db_user.otp_expires_at = utcnow() + timedelta(minutes=10)
        log_audit(db, 'SEND_FIRST_LOGIN_OTP', db_user.id, f'Generated 6-digit OTP for {db_user.username} ({phone})')
        db.commit()

        masked = f'XXXXXX{phone[-4:]}' if len(phone) >= 4 else 'Registered Mobile'
        return {
            'message': f'6-digit OTP generated for {masked}',
            'masked_phone': masked,
            'offline_otp_preview': otp,
        }
    finally:
        db.close()


@app.post('/auth/first-login/change-password')
def complete_first_login_password_change(
    payload: FirstLoginPasswordChangeRequest,
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        db_user = db.query(User).filter(User.id == user.id).first()
        if db_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

        stored_otp = (db_user.otp_code or '').strip()
        if not stored_otp or stored_otp != payload.otp_code.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid 6-digit OTP code. Please check and try again.',
            )

        if db_user.otp_expires_at:
            exp = db_user.otp_expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if utcnow() > exp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='OTP has expired. Please request a new OTP.',
                )

        if verify_password(payload.new_password, db_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='New password must be different from the initial password set by admin.',
            )

        db_user.password_hash = hash_password(payload.new_password)
        db_user.must_change_password = False
        db_user.otp_code = None
        db_user.otp_expires_at = None
        db_user.updated_at = utcnow()
        log_audit(db, 'FIRST_LOGIN_PASSWORD_CHANGED', db_user.id, f'User {db_user.username} verified mobile OTP and set new password')
        db.commit()
        return {'message': 'Password updated successfully.', 'must_change_password': False}
    finally:
        db.close()


# ── Store Configuration Endpoints ─────────────────────────────────────


@app.get('/api/settings/store')
def get_store_settings(user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        s = db.query(StoreSettings).first()
        if s is None:
            seed_default_settings()
            s = db.query(StoreSettings).first()
        return serialize_store_settings(s)
    finally:
        db.close()


@app.put('/api/settings/store')
def update_store_settings(
    payload: StoreSettingsUpdateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        s = db.query(StoreSettings).first()
        if s is None:
            s = StoreSettings()
            db.add(s)

        # Validate GSTIN if GST enabled
        if payload.gst_enabled and payload.gstin:
            clean_gstin = payload.gstin.strip().upper()
            if not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', clean_gstin):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='अवैध GSTIN स्वरूप. १५ अंकी अधिकृत GSTIN टाका (उदा. 27ABCDE1234F1Z5).',
                )
            s.gstin = clean_gstin
        else:
            s.gstin = payload.gstin.strip().upper() if payload.gstin else None

        s.store_name = payload.store_name.strip()
        s.owner_name = payload.owner_name.strip() if payload.owner_name else None
        s.address = payload.address.strip() if payload.address else None
        s.city = payload.city.strip() if payload.city else None
        s.state = payload.state.strip() if payload.state else None
        s.pin_code = payload.pin_code.strip() if payload.pin_code else None
        s.country = payload.country.strip() if payload.country else 'भारत'
        s.phone = payload.phone.strip() if payload.phone else None
        s.email = payload.email.strip() if payload.email else None
        s.gst_enabled = payload.gst_enabled
        s.business_logo = payload.business_logo
        s.invoice_prefix = payload.invoice_prefix.strip() or 'INV'
        s.currency_symbol = payload.currency_symbol.strip() or '₹'
        s.locale = payload.locale.strip() or 'mr-IN'
        s.receipt_header = payload.receipt_header
        s.receipt_footer = payload.receipt_footer
        s.tax_inclusive = payload.tax_inclusive
        s.default_gst_rate = payload.default_gst_rate
        s.updated_at = utcnow()

        log_audit(db, 'UPDATE_STORE_SETTINGS', user.id, f'Updated by {user.username}')
        db.commit()
        db.refresh(s)
        return serialize_store_settings(s)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Settings update failed: {exc}') from exc
    finally:
        db.close()


# ── Payment & UPI Configuration Endpoints ─────────────────────────────


@app.get('/api/settings/payment')
def get_payment_settings(user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        p = db.query(PaymentSettings).first()
        if p is None:
            seed_default_settings()
            p = db.query(PaymentSettings).first()
        is_admin = user.role == UserRole.ADMIN
        return serialize_payment_settings(p, is_admin=is_admin)
    finally:
        db.close()


@app.put('/api/settings/payment')
def update_payment_settings(
    payload: PaymentSettingsUpdateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        p = db.query(PaymentSettings).first()
        if p is None:
            p = PaymentSettings()
            db.add(p)

        upi_id = payload.upi_id.strip() if payload.upi_id else None
        if payload.upi_enabled and upi_id:
            if '@' not in upi_id or len(upi_id) < 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='अवैध UPI ID. योग्य UPI ID टाका (उदा. merchant@upi किंवा 9876543210@paytm).',
                )

        p.upi_enabled = payload.upi_enabled
        p.payee_name = payload.payee_name.strip() if payload.payee_name else None
        p.upi_id = upi_id
        p.payment_description = payload.payment_description.strip() if payload.payment_description else None
        if payload.static_qr_image is not None:
            p.static_qr_image = payload.static_qr_image
        p.gateway_enabled = payload.gateway_enabled
        p.gateway_provider = payload.gateway_provider or 'MANUAL'
        p.updated_at = utcnow()

        log_audit(db, 'UPDATE_PAYMENT_SETTINGS', user.id, f'UPI settings updated by {user.username}')
        db.commit()
        db.refresh(p)
        return serialize_payment_settings(p, is_admin=True)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Payment update failed: {exc}') from exc
    finally:
        db.close()


@app.get('/api/payments/upi-uri')
def generate_upi_uri(
    amount: float = Query(..., gt=0),
    invoice_number: str | None = Query(None),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        p = db.query(PaymentSettings).first()
        if p is None or not p.upi_enabled or not p.upi_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='UPI पेमेंट सध्या सक्षम किंवा कॉन्फिगर केलेले नाही.',
            )

        payee_name = p.payee_name or 'Store'
        clean_note = f'Bill {invoice_number}' if invoice_number else (p.payment_description or 'POS Payment')
        amt_str = f'{amount:.2f}'
        # Standard NPCI UPI URI Format
        encoded_pn = payee_name.replace(' ', '%20')
        encoded_tn = clean_note.replace(' ', '%20')
        uri = f'upi://pay?pa={p.upi_id}&pn={encoded_pn}&am={amt_str}&cu=INR&tn={encoded_tn}'

        return {
            'upi_uri': uri,
            'payee_name': payee_name,
            'upi_id': p.upi_id,
            'amount': amount,
            'note': clean_note,
            'has_static_qr': bool(p.static_qr_image),
            'static_qr_image': p.static_qr_image,
        }
    finally:
        db.close()


# ── Staff Management Endpoints ───────────────────────────────────────


@app.get('/admin/staff/next-code')
def get_next_employee_code(
    role: str = Query('CASHIER'),
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, str]:
    db: Session = SessionLocal()
    try:
        return {'staff_id': compute_next_employee_code(db, role)}
    finally:
        db.close()


@app.get('/admin/staff')
def list_staff(user: User = Depends(require_role(UserRole.ADMIN.value))) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return [serialize_staff_user(u) for u in users]
    finally:
        db.close()


@app.post('/admin/staff')
def create_staff(
    payload: StaffCreateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        username = payload.username.strip()
        existing = db.query(User).filter(User.username == username).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='This login username is already in use.',
            )

        role_enum = UserRole.ADMIN if payload.role.upper() == 'ADMIN' else UserRole.CASHIER

        # Validate Indian mobile & Government KYC ID if provided
        clean_phone, clean_doc_ref = validate_indian_mobile_and_kyc(
            payload.contact_number,
            payload.document_type,
            payload.document_ref,
            require_all=False,
        )

        assigned_staff_id = (payload.staff_id or '').strip()
        existing_staff_ids = {(u.staff_id or '').strip().upper() for u in db.query(User).all() if u.staff_id}
        if not assigned_staff_id or assigned_staff_id.upper() in existing_staff_ids:
            assigned_staff_id = compute_next_employee_code(db, role_enum.value)

        new_user = User(
            name=payload.name.strip(),
            username=username,
            password_hash=hash_password(payload.password),
            role=role_enum,
            is_active=True,
            contact_number=clean_phone,
            email=payload.email.strip() if payload.email else None,
            address=payload.address.strip() if payload.address else None,
            staff_id=assigned_staff_id,
            joining_date=payload.joining_date.strip() if payload.joining_date else None,
            document_type=payload.document_type.strip() if payload.document_type else None,
            document_ref=clean_doc_ref,
            document_status='VERIFIED' if payload.hard_copy_collected else (payload.document_status or 'PENDING'),
            document_notes=payload.document_notes.strip() if payload.document_notes else None,
            document_submitted_at=utcnow() if (payload.document_type or payload.document_file) else None,
            hard_copy_collected=bool(payload.hard_copy_collected),
            must_change_password=(role_enum == UserRole.CASHIER),
            created_at=utcnow(),
        )
        db.add(new_user)
        db.flush()

        if payload.document_file:
            save_staff_document_to_disk_and_db(db, new_user, payload.document_file)

        log_audit(
            db,
            'CREATE_STAFF',
            user.id,
            f'Created user {username} ({assigned_staff_id}) with role {role_enum.value}',
        )
        db.commit()
        db.refresh(new_user)
        return serialize_staff_user(new_user)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Failed to create staff: {exc}') from exc
    finally:
        db.close()


@app.get('/admin/staff/{user_id}')
def get_staff_detail(
    user_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')
        return serialize_staff_user(staff)
    finally:
        db.close()


@app.put('/admin/staff/{user_id}')
def update_staff_detail(
    user_id: int,
    payload: StaffUpdateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')

        fields = payload.model_dump(exclude_unset=True)
        if 'contact_number' in fields or 'document_ref' in fields:
            clean_phone, clean_doc_ref = validate_indian_mobile_and_kyc(
                fields.get('contact_number', staff.contact_number),
                fields.get('document_type', staff.document_type),
                fields.get('document_ref', staff.document_ref),
                require_all=False,
            )
            if 'contact_number' in fields:
                fields['contact_number'] = clean_phone
            if 'document_ref' in fields:
                fields['document_ref'] = clean_doc_ref

        for key, value in fields.items():
            if value is not None:
                setattr(staff, key, value)

        staff.updated_at = utcnow()
        log_audit(db, 'UPDATE_STAFF', user.id, f'Updated staff id {user_id} ({staff.username})')
        db.commit()
        db.refresh(staff)
        return serialize_staff_user(staff)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Failed to update staff: {exc}') from exc
    finally:
        db.close()


@app.patch('/admin/staff/{user_id}/status')
def toggle_staff_status(
    user_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')
        if staff.id == user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot disable your own active account.')

        staff.is_active = not staff.is_active
        staff.updated_at = utcnow()
        log_audit(db, 'TOGGLE_STAFF_STATUS', user.id, f'User {staff.username} active={staff.is_active}')
        db.commit()
        db.refresh(staff)
        return {'id': staff.id, 'username': staff.username, 'is_active': staff.is_active}
    finally:
        db.close()


@app.post('/admin/staff/{user_id}/send-reset-otp')
def send_staff_reset_otp(
    user_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')

        otp = f'{random.randint(100000, 999999)}'
        staff.otp_code = otp
        staff.otp_expires_at = utcnow() + timedelta(minutes=10)
        staff.updated_at = utcnow()
        phone = staff.contact_number or 'Registered Mobile'
        log_audit(db, 'ADMIN_RESET_OTP_SENT', user.id, f'Sent 6-digit password reset OTP for {staff.username} ({phone})')
        db.commit()

        masked = f'XXXXXX{phone[-4:]}' if len(phone) >= 4 else phone
        return {
            'message': f'6-digit OTP sent to {masked}',
            'masked_phone': masked,
            'contact_number': staff.contact_number or '',
            'offline_otp_preview': otp,
        }
    finally:
        db.close()


@app.post('/admin/staff/{user_id}/reset-password')
def reset_staff_password(
    user_id: int,
    payload: StaffPasswordResetRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')

        # Require Cashier Mobile OTP verification when resetting password via UI
        if payload.otp_code is not None or staff.otp_code:
            entered_otp = (payload.otp_code or '').strip()
            stored_otp = (staff.otp_code or '').strip()
            if not entered_otp or not stored_otp or entered_otp != stored_otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail='Invalid or missing 6-digit Mobile OTP. Please send OTP to the cashier mobile number first.',
                )
            if staff.otp_expires_at:
                exp = staff.otp_expires_at
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if utcnow() > exp:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail='Mobile OTP has expired. Please request a new OTP.',
                    )

        staff.password_hash = hash_password(payload.new_password)
        staff.otp_code = None
        staff.otp_expires_at = None
        if staff.role == UserRole.CASHIER:
            staff.must_change_password = True
        staff.updated_at = utcnow()
        log_audit(db, 'RESET_PASSWORD', user.id, f'Reset password for {staff.username} via Mobile OTP')
        db.commit()
        return {'message': f'Password reset successfully for {staff.username}.'}
    finally:
        db.close()


@app.post('/admin/staff/{user_id}/documents')
def upload_staff_document(
    user_id: int,
    payload: DocumentUploadRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        staff = db.query(User).filter(User.id == user_id).first()
        if staff is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Staff account not found.')

        doc = save_staff_document_to_disk_and_db(db, staff, payload)
        log_audit(db, 'UPLOAD_STAFF_DOCUMENT', user.id, f'Uploaded {payload.original_name} for {staff.username}')
        db.commit()
        db.refresh(doc)
        return {
            'id': doc.id,
            'original_name': doc.original_name,
            'mime_type': doc.mime_type,
            'uploaded_at': doc.uploaded_at.isoformat(),
        }
    finally:
        db.close()


@app.get('/admin/staff/{user_id}/documents')
def list_staff_documents(
    user_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        docs = db.query(StaffDocument).filter(StaffDocument.user_id == user_id).all()
        return [
            {
                'id': d.id,
                'original_name': d.original_name,
                'mime_type': d.mime_type,
                'file_size': d.file_size,
                'uploaded_at': d.uploaded_at.isoformat(),
            }
            for d in docs
        ]
    finally:
        db.close()


@app.get('/admin/documents/{doc_id}')
def get_private_document(
    doc_id: int,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        doc = db.query(StaffDocument).filter(StaffDocument.id == doc_id).first()
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='दस्तऐवज आढळला नाही.')
        return {
            'id': doc.id,
            'original_name': doc.original_name,
            'mime_type': doc.mime_type,
            'document_data': doc.document_data,
            'uploaded_at': doc.uploaded_at.isoformat(),
        }
    finally:
        db.close()


# Backward compatibility for existing tests
@app.get('/admin/users')
def admin_users(user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, str]:
    return {'message': f'Admin access granted for {user.username}'}


@app.post('/admin/users')
def create_cashier(
    payload: CashierCreateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
    return create_staff(
        StaffCreateRequest(
            name=payload.name,
            username=payload.username,
            password=payload.password,
            role='CASHIER',
        ),
        user=user,
    )


# ── Products Endpoints ────────────────────────────────────────────────


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
        cancelled_parents = {
            int(row.parent_invoice_id)
            for row in db.query(Invoice).filter(
                Invoice.status == InvoiceStatus.CANCELLED,
                Invoice.parent_invoice_id.is_not(None),
            ).all()
            if row.parent_invoice_id is not None
        }
        q = (
            db.query(Product, func.count(InvoiceItem.id).label('frequency'))
            .join(InvoiceItem, InvoiceItem.product_id == Product.id)
            .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
            .filter(Product.is_active.is_(True))
            .filter(Invoice.status == InvoiceStatus.COMPLETED)
            .filter(Invoice.parent_invoice_id.is_(None))
            .filter(
                or_(
                    Invoice.payment_status.is_(None),
                    ~Invoice.payment_status.in_(['RETURN', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID']),
                )
            )
        )
        if cancelled_parents:
            q = q.filter(~Invoice.id.in_(cancelled_parents))
        rows = (
            q.group_by(Product.id)
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


def compute_ean13_check_digit(digits12: str) -> str:
    total = sum(int(d) * (3 if i % 2 == 1 else 1) for i, d in enumerate(digits12))
    return str((10 - (total % 10)) % 10)


@app.post('/products/barcode/generate')
def generate_product_barcode(user: User = Depends(require_role(UserRole.ADMIN.value))) -> dict[str, str]:
    db: Session = SessionLocal()
    try:
        in_store_products = db.query(Product.barcode).filter(Product.barcode.like('200%')).all()
        existing_codes = {p.barcode for p in in_store_products if p.barcode}

        sequence = 1
        for code in existing_codes:
            if len(code) == 13 and code.isdigit() and code.startswith('200'):
                try:
                    num = int(code[3:12])
                    if num >= sequence:
                        sequence = num + 1
                except ValueError:
                    pass

        candidate = None
        for seq in range(sequence, sequence + 50000):
            d12 = f'200{seq:09d}'
            chk = compute_ean13_check_digit(d12)
            ean13 = f'{d12}{chk}'
            if ean13 not in existing_codes:
                candidate = ean13
                break

        if candidate is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='बारकोड तयार करण्यात अयशस्वी.')

        normalized = normalize_barcode(candidate)
        if normalized is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Generated barcode invalid.')

        return {'barcode': normalized}
    finally:
        db.close()


@app.post('/products')
def create_product(
    payload: ProductCreateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
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
            created_at=utcnow(),
        )
        db.add(product)
        log_audit(db, 'CREATE_PRODUCT', user.id, f'Created product {product.name_mr}')
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
def update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> dict[str, Any]:
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

        product.updated_at = utcnow()
        log_audit(db, 'UPDATE_PRODUCT', user.id, f'Updated product id {product_id} ({product.name_mr})')
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
        product.updated_at = utcnow()
        history = ProductPriceHistory(
            product_id=product.id,
            old_price=old_price,
            new_price=new_price,
            changed_by=user.id,
            reason=payload.reason,
            changed_at=utcnow(),
        )
        db.add(history)
        log_audit(db, 'UPDATE_PRODUCT_PRICE', user.id, f'Product {product_id} price: {old_price} -> {new_price}')
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


# ── Billing & Sales Endpoints ─────────────────────────────────────────


@app.post('/bills')
def create_bill(
    payload: BillingRequest,
    request: Request,
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invoice requires at least one item')

    # Idempotency check
    idempotency_key = payload.idempotency_key or request.headers.get('X-Idempotency-Key')
    if idempotency_key and idempotency_key in RECENT_IDEMPOTENCY_KEYS:
        cached = RECENT_IDEMPOTENCY_KEYS[idempotency_key]
        if cached.get('user_id') == user.id:
            return cached['response']

    db: Session = SessionLocal()
    try:
        store_settings = db.query(StoreSettings).first()
        is_tax_inclusive = store_settings.tax_inclusive if store_settings else True
        prefix = (store_settings.invoice_prefix if store_settings else 'INV').strip() or 'INV'

        subtotal = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_taxable = Decimal('0.00')
        total_item_discount = Decimal('0.00')

        bill_items: list[dict[str, Any]] = []

        for item in payload.items:
            product = db.query(Product).filter(Product.id == item.product_id, Product.is_active.is_(True)).first()
            if product is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Product not found: {item.product_id}')

            qty = Decimal(str(item.quantity))
            stock = Decimal(str(product.current_stock))
            if stock < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f'Insufficient stock: अपुरा साठा ({product.name_mr}): उपलब्ध {stock}, मागणी {qty}',
                )

            unit_price = Decimal(str(product.selling_price or 0.0))
            line_disc = Decimal(str(item.discount or 0.0))
            gst_rate = Decimal(str(product.gst_rate or 0.0))

            raw_line_total = (unit_price * qty) - line_disc
            if raw_line_total < Decimal('0.00'):
                raw_line_total = Decimal('0.00')

            if is_tax_inclusive:
                # Price includes GST: Base = Total / (1 + Rate/100)
                if gst_rate > Decimal('0.00'):
                    line_taxable = (raw_line_total / (Decimal('1.00') + (gst_rate / Decimal('100.00')))).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    line_tax = raw_line_total - line_taxable
                else:
                    line_taxable = raw_line_total
                    line_tax = Decimal('0.00')
                line_total = raw_line_total
            else:
                # Price excludes GST: Tax = Base * (Rate/100)
                line_taxable = raw_line_total
                line_tax = (line_taxable * (gst_rate / Decimal('100.00'))).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                line_total = line_taxable + line_tax

            subtotal += line_total
            total_taxable += line_taxable
            total_tax += line_tax
            total_item_discount += line_disc

            bill_items.append(
                {
                    'product': product,
                    'quantity': float(qty),
                    'unit_price': float(unit_price),
                    'discount': float(line_disc),
                    'gst_rate': float(gst_rate),
                    'taxable_amount': float(line_taxable),
                    'tax_amount': float(line_tax),
                    'line_total': float(line_total),
                }
            )

        bill_discount = Decimal(str(payload.discount or 0.0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if bill_discount < Decimal('0.00'):
            bill_discount = Decimal('0.00')
        if bill_discount > subtotal:
            bill_discount = subtotal
        grand_total = subtotal - bill_discount
        if grand_total < Decimal('0.00'):
            grand_total = Decimal('0.00')

        if bill_discount > Decimal('0.00') and subtotal > Decimal('0.00'):
            discount_ratio = grand_total / subtotal
            total_tax = (total_tax * discount_ratio).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_taxable = max(Decimal('0.00'), grand_total - total_tax)

        cgst = (total_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        sgst = total_tax - cgst

        # Safe sequential invoice numbering
        latest_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
        sequence = int((latest_invoice.id if latest_invoice else 0)) + 1
        invoice_number = f'{prefix}-{sequence:06d}'

        now = utcnow()
        is_credit_bill = payload.payment_method.upper() == 'CREDIT'
        grand_total_cur = round_cur(grand_total)
        initial_paid = 0.0
        if is_credit_bill:
            raw_initial = float(payload.initial_paid_amount or 0.0)
            initial_paid = round_cur(min(grand_total_cur, max(0.0, raw_initial)))
            initial_balance = round_cur(max(0.0, grand_total_cur - initial_paid))
            if initial_balance <= 0.01:
                computed_pay_status = 'PAID'
            elif initial_paid > 0.0:
                computed_pay_status = 'PARTIAL'
            else:
                computed_pay_status = 'CREDIT_DUE'
        else:
            initial_paid = grand_total_cur
            initial_balance = 0.0
            computed_pay_status = 'PAID'

        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_date=now,
            subtotal=round_cur(subtotal),
            discount=round_cur(bill_discount),
            tax_amount=round_cur(total_tax),
            taxable_amount=round_cur(total_taxable),
            cgst_amount=round_cur(cgst),
            sgst_amount=round_cur(sgst),
            grand_total=grand_total_cur,
            payment_method=PaymentMethod(payload.payment_method.upper()),
            status=InvoiceStatus.COMPLETED,
            created_by=user.id,
            created_at=now,
            customer_name=payload.customer_name.strip() if payload.customer_name else None,
            customer_phone=payload.customer_phone.strip() if payload.customer_phone else None,
            payment_reference=payload.payment_reference.strip() if payload.payment_reference else None,
            payment_status=computed_pay_status,
            paid_amount=initial_paid,
            balance_due=initial_balance,
            cash_tendered=round_cur(payload.cash_tendered) if payload.cash_tendered is not None else None,
            change_returned=round_cur(payload.change_returned) if payload.change_returned is not None else None,
            notes=payload.notes.strip() if payload.notes else None,
        )
        db.add(invoice)
        db.flush()

        if is_credit_bill and initial_paid > 0.0:
            init_settlement = CreditSettlement(
                invoice_id=invoice.id,
                amount=initial_paid,
                payment_mode=(payload.initial_payment_mode or 'CASH').upper(),
                reference_note=INITIAL_CREDIT_PAYMENT_NOTE,
                recorded_by=user.id,
                settled_at=now,
            )
            db.add(init_settlement)

        stock_after_sale = 0
        for item in bill_items:
            product = item['product']
            invoice_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=product.id,
                product_name_mr=product.name_mr,
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                discount=item['discount'],
                gst_rate=item['gst_rate'],
                tax_amount=item['tax_amount'],
                total=item['line_total'],
            )
            db.add(invoice_item)

            product.current_stock = int(Decimal(str(product.current_stock)) - Decimal(str(item['quantity'])))
            db.add(
                StockMovement(
                    product_id=product.id,
                    type=StockMovementType.SALE,
                    quantity=-float(item['quantity']),
                    reference_id=invoice.invoice_number,
                    created_at=now,
                )
            )
            stock_after_sale = product.current_stock

        db.commit()
        db.refresh(invoice)

        response = {
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'date': invoice.invoice_date.isoformat(),
            'subtotal': float(invoice.subtotal),
            'discount': float(invoice.discount),
            'tax_amount': float(invoice.tax_amount),
            'taxable_amount': float(invoice.taxable_amount or 0.0),
            'cgst_amount': float(invoice.cgst_amount or 0.0),
            'sgst_amount': float(invoice.sgst_amount or 0.0),
            'grand_total': float(invoice.grand_total),
            'paid_amount': float(invoice.paid_amount if invoice.paid_amount is not None else invoice.grand_total),
            'balance_due': float(invoice.balance_due if invoice.balance_due is not None else 0.0),
            'payment_method': invoice.payment_method.value,
            'payment_status': invoice.payment_status or 'PAID',
            'status': invoice.status.value,
            'customer_name': invoice.customer_name,
            'customer_phone': invoice.customer_phone,
            'cash_tendered': float(invoice.cash_tendered) if invoice.cash_tendered is not None else None,
            'change_returned': float(invoice.change_returned) if invoice.change_returned is not None else None,
            'payment_reference': invoice.payment_reference,
            'stock_after_sale': stock_after_sale,
        }

        if idempotency_key:
            RECENT_IDEMPOTENCY_KEYS[idempotency_key] = {
                'user_id': user.id,
                'response': response,
                'created_at': now,
            }
            # Clean up old keys if dict grows large
            if len(RECENT_IDEMPOTENCY_KEYS) > 100:
                oldest_key = next(iter(RECENT_IDEMPOTENCY_KEYS))
                del RECENT_IDEMPOTENCY_KEYS[oldest_key]

        return response
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Billing failed: {exc}') from exc
    finally:
        db.close()


# ── Invoices & History Endpoints ─────────────────────────────────────

INITIAL_CREDIT_PAYMENT_NOTE = 'Initial partial payment at billing counter'


def get_cancelled_parent_ids(db: Session, invoice_ids: list[int] | None = None) -> set[int]:
    q = db.query(Invoice.parent_invoice_id).filter(
        Invoice.status == InvoiceStatus.CANCELLED,
        Invoice.parent_invoice_id.is_not(None),
    )
    if invoice_ids is not None:
        if not invoice_ids:
            return set()
        q = q.filter(Invoice.parent_invoice_id.in_(invoice_ids))
    return {int(row[0]) for row in q.all() if row[0] is not None}


def build_credit_settlement_info_map(
    db: Session,
    invoice_ids: list[int] | None = None,
) -> dict[int, dict[str, Any]]:
    q = db.query(CreditSettlement)
    if invoice_ids is not None:
        if not invoice_ids:
            return {}
        q = q.filter(CreditSettlement.invoice_id.in_(invoice_ids))

    info_map: dict[int, dict[str, Any]] = {}
    for s in q.all():
        entry = info_map.setdefault(
            s.invoice_id,
            {'total_settled': 0.0, 'has_initial_record': False},
        )
        entry['total_settled'] = round_cur(entry['total_settled'] + float(s.amount or 0.0))
        if (s.reference_note or '').strip() == INITIAL_CREDIT_PAYMENT_NOTE:
            entry['has_initial_record'] = True
    return info_map


def build_return_summary_map(
    db: Session,
    parent_invoice_ids: list[int] | None = None,
) -> dict[int, dict[str, float]]:
    q = db.query(Invoice).filter(
        Invoice.parent_invoice_id.is_not(None),
        Invoice.payment_status == 'RETURN',
        Invoice.status == InvoiceStatus.COMPLETED,
    )
    if parent_invoice_ids is not None:
        if not parent_invoice_ids:
            return {}
        q = q.filter(Invoice.parent_invoice_id.in_(parent_invoice_ids))

    ret_map: dict[int, dict[str, float]] = {}
    for r in q.all():
        if r.parent_invoice_id is None:
            continue
        pid = int(r.parent_invoice_id)
        entry = ret_map.setdefault(
            pid,
            {'returned_total': 0.0, 'cash_refunded': 0.0, 'udhari_deducted': 0.0},
        )
        r_total = float(r.grand_total or 0.0)
        if r.payment_method == PaymentMethod.CREDIT:
            r_refund = round_cur(min(r_total, max(0.0, float(r.paid_amount or 0.0))))
            r_udhari = round_cur(max(0.0, r_total - r_refund))
        else:
            r_refund = round_cur(r_total)
            r_udhari = 0.0
        entry['returned_total'] = round_cur(entry['returned_total'] + r_total)
        entry['cash_refunded'] = round_cur(entry['cash_refunded'] + r_refund)
        entry['udhari_deducted'] = round_cur(entry['udhari_deducted'] + r_udhari)
    return ret_map


def compute_invoice_accounting(
    invoice: Invoice,
    settlement_info_map: dict[int, dict[str, Any]] | None = None,
    return_summary_map: dict[int, dict[str, float]] | None = None,
    cancelled_parent_ids: set[int] | None = None,
    settled_map: dict[int, float] | None = None,
) -> dict[str, Any]:
    total_amt = round_cur(float(invoice.grand_total or 0.0))
    raw_pay_status = (invoice.payment_status or '').strip()
    is_credit = invoice.payment_method == PaymentMethod.CREDIT
    has_cancel_child = bool(cancelled_parent_ids and invoice.id in cancelled_parent_ids)

    # 1. Cancelled audit record
    if invoice.status == InvoiceStatus.CANCELLED:
        return {
            'paid_amount': 0.0,
            'balance_due': 0.0,
            'payment_status': 'CANCELLED',
            'returned_amount': 0.0,
            'udhari_deducted': 0.0,
            'cash_refund': 0.0,
            'net_paid_amount': 0.0,
            'effective_grand_total': 0.0,
            'has_cancel_record': has_cancel_child,
        }

    # 2. Child RETURN bill
    if raw_pay_status == 'RETURN':
        if is_credit:
            cash_refund = round_cur(min(total_amt, max(0.0, float(invoice.paid_amount or 0.0))))
            udhari_deducted = round_cur(max(0.0, total_amt - cash_refund))
        else:
            cash_refund = total_amt
            udhari_deducted = 0.0
        return {
            'paid_amount': cash_refund,
            'balance_due': 0.0,
            'payment_status': 'RETURN',
            'returned_amount': total_amt,
            'udhari_deducted': udhari_deducted,
            'cash_refund': cash_refund,
            'net_paid_amount': cash_refund,
            'effective_grand_total': total_amt,
            'has_cancel_record': has_cancel_child,
        }

    # 3. Child UDHARI_PAID / UDHARI_PARTIAL_PAID settlement receipt
    if raw_pay_status in ('UDHARI_PAID', 'UDHARI_PARTIAL_PAID'):
        paid_amt = round_cur(float(invoice.paid_amount if invoice.paid_amount is not None else total_amt))
        bal_due = round_cur(max(0.0, float(invoice.balance_due or 0.0)))
        return {
            'paid_amount': paid_amt,
            'balance_due': bal_due,
            'payment_status': raw_pay_status,
            'returned_amount': 0.0,
            'udhari_deducted': 0.0,
            'cash_refund': 0.0,
            'net_paid_amount': paid_amt,
            'effective_grand_total': total_amt,
            'has_cancel_record': has_cancel_child,
        }

    # 4. Parent Sales Bill
    ret_info = (return_summary_map or {}).get(invoice.id, {})
    returned_total = round_cur(min(total_amt, float(ret_info.get('returned_total', 0.0))))
    effective_grand_total = round_cur(max(0.0, total_amt - returned_total))

    if is_credit:
        if settlement_info_map is not None and invoice.id in settlement_info_map:
            s_info = settlement_info_map[invoice.id]
            settled_sum = float(s_info.get('total_settled', 0.0))
            if s_info.get('has_initial_record'):
                gross_paid = round_cur(min(total_amt, settled_sum))
            else:
                init_paid = float(invoice.paid_amount or 0.0)
                gross_paid = round_cur(min(total_amt, init_paid + settled_sum))
        elif settled_map is not None and invoice.id in settled_map:
            gross_paid = round_cur(min(total_amt, float(settled_map[invoice.id] or 0.0)))
        else:
            gross_paid = round_cur(min(total_amt, float(invoice.paid_amount or 0.0)))

        cash_refunded = round_cur(min(gross_paid, float(ret_info.get('cash_refunded', 0.0))))
        udhari_deducted = round_cur(max(0.0, returned_total - cash_refunded))
        net_paid = round_cur(max(0.0, gross_paid - cash_refunded))
        bal_due = 0.0 if has_cancel_child else round_cur(max(0.0, effective_grand_total - net_paid))

        if has_cancel_child:
            pay_status = 'CANCELLED'
        elif bal_due <= 0.01:
            pay_status = 'PAID'
        elif net_paid > 0.0:
            pay_status = 'PARTIAL'
        else:
            pay_status = 'CREDIT_DUE'
    else:
        gross_paid = total_amt
        cash_refunded = returned_total
        udhari_deducted = 0.0
        net_paid = effective_grand_total
        bal_due = 0.0
        pay_status = 'CANCELLED' if has_cancel_child else (raw_pay_status or 'PAID')

    return {
        'paid_amount': net_paid,
        'balance_due': bal_due,
        'payment_status': pay_status,
        'returned_amount': returned_total,
        'udhari_deducted': udhari_deducted,
        'cash_refund': cash_refunded,
        'net_paid_amount': net_paid,
        'effective_grand_total': effective_grand_total,
        'has_cancel_record': has_cancel_child,
    }


def serialize_invoice_summary(
    invoice: Invoice,
    cancelled_parent_ids: set[int] | None = None,
    settled_map: dict[int, float] | None = None,
    settlement_info_map: dict[int, dict[str, Any]] | None = None,
    return_summary_map: dict[int, dict[str, float]] | None = None,
) -> dict[str, Any]:
    creator_name = invoice.creator.name if invoice.creator else 'Unknown'
    creator_username = invoice.creator.username if invoice.creator else 'unknown'
    total_amt = round_cur(float(invoice.grand_total or 0.0))

    acct = compute_invoice_accounting(
        invoice,
        settlement_info_map=settlement_info_map,
        return_summary_map=return_summary_map,
        cancelled_parent_ids=cancelled_parent_ids,
        settled_map=settled_map,
    )

    items_list = invoice.invoice_items or []
    all_items_returned = bool(items_list) and all(
        float(getattr(item, 'returned_quantity', 0) or 0) >= float(item.quantity or 0) - 1e-6
        for item in items_list
    )

    is_child_record = (
        invoice.parent_invoice_id is not None
        or (invoice.payment_status or '') in ('RETURN', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID')
    )
    can_cancel = bool(
        invoice.status == InvoiceStatus.COMPLETED
        and not is_child_record
        and not acct['has_cancel_record']
        and not all_items_returned
    )

    return {
        'id': invoice.id,
        'invoice_number': invoice.invoice_number,
        'date': invoice.invoice_date.isoformat(),
        'subtotal': float(invoice.subtotal),
        'discount': float(invoice.discount),
        'tax_amount': float(invoice.tax_amount),
        'taxable_amount': float(invoice.taxable_amount or 0.0),
        'cgst_amount': float(invoice.cgst_amount or 0.0),
        'sgst_amount': float(invoice.sgst_amount or 0.0),
        'amount': total_amt,
        'grand_total': total_amt,
        'paid_amount': acct['paid_amount'],
        'balance_due': acct['balance_due'],
        'returned_amount': acct['returned_amount'],
        'udhari_deducted': acct['udhari_deducted'],
        'cash_refund': acct['cash_refund'],
        'net_paid_amount': acct['net_paid_amount'],
        'effective_grand_total': acct['effective_grand_total'],
        'all_items_returned': all_items_returned,
        'can_cancel': can_cancel,
        'payment_method': invoice.payment_method.value,
        'payment_status': acct['payment_status'],
        'status': invoice.status.value,
        'parent_invoice_id': invoice.parent_invoice_id,
        'has_cancel_record': acct['has_cancel_record'],
        'created_by': invoice.created_by,
        'created_by_name': creator_name,
        'created_by_username': creator_username,
        'customer_name': invoice.customer_name,
        'customer_phone': invoice.customer_phone,
        'payment_reference': invoice.payment_reference,
        'cash_tendered': float(invoice.cash_tendered) if invoice.cash_tendered is not None else None,
        'change_returned': float(invoice.change_returned) if invoice.change_returned is not None else None,
        'notes': invoice.notes,
        'items_count': len(items_list),
    }


def serialize_invoice_detail(
    invoice: Invoice,
    cancelled_parent_ids: set[int] | None = None,
    settled_map: dict[int, float] | None = None,
    db: Session | None = None,
    settlement_info_map: dict[int, dict[str, Any]] | None = None,
    return_summary_map: dict[int, dict[str, float]] | None = None,
) -> dict[str, Any]:
    if db is not None:
        if cancelled_parent_ids is None:
            cancelled_parent_ids = get_cancelled_parent_ids(db, [invoice.id])
        if settlement_info_map is None:
            settlement_info_map = build_credit_settlement_info_map(db, [invoice.id])
        if return_summary_map is None:
            return_summary_map = build_return_summary_map(db, [invoice.id])

    summary = serialize_invoice_summary(
        invoice,
        cancelled_parent_ids=cancelled_parent_ids,
        settled_map=settled_map,
        settlement_info_map=settlement_info_map,
        return_summary_map=return_summary_map,
    )
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
            'returned_quantity': float(getattr(item, 'returned_quantity', 0) or 0),
            'unit_price': float(item.unit_price),
            'discount': float(item.discount),
            'gst_rate': float(item.gst_rate) if item.gst_rate is not None else 0.0,
            'tax_amount': float(item.tax_amount) if item.tax_amount is not None else 0.0,
            'total': float(item.total),
        }
        for item in invoice.invoice_items
    ]

    now = utcnow()
    inv_dt = invoice.created_at or invoice.invoice_date
    if inv_dt.tzinfo is None:
        inv_dt = inv_dt.replace(tzinfo=timezone.utc)
    elapsed_hours = round(max(0.0, (now - inv_dt).total_seconds() / 3600.0), 2)
    has_cancel_child = summary.get('has_cancel_record', False)

    any_returnable = any(
        float(item.quantity) > float(getattr(item, 'returned_quantity', 0) or 0) + 1e-6
        for item in invoice.invoice_items
    ) if invoice.invoice_items else False

    is_returnable = bool(
        invoice.status == InvoiceStatus.COMPLETED
        and invoice.parent_invoice_id is None
        and (invoice.payment_status or '') not in ('RETURN', 'CANCELLED', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID')
        and not has_cancel_child
        and elapsed_hours <= 7.0
        and any_returnable
    )

    summary['is_returnable'] = is_returnable
    summary['elapsed_hours'] = elapsed_hours
    summary['return_window_hours'] = 7.0
    summary['settlement_history'] = []
    summary['linked_bills'] = []
    summary['parent_invoice_number'] = None

    if db is not None:
        settlements = (
            db.query(CreditSettlement)
            .filter(CreditSettlement.invoice_id == invoice.id)
            .order_by(CreditSettlement.settled_at.asc())
            .all()
        )
        summary['settlement_history'] = [
            {
                'id': s.id,
                'amount': float(s.amount),
                'payment_mode': s.payment_mode,
                'reference_note': s.reference_note,
                'settled_at': s.settled_at.isoformat() if s.settled_at else None,
            }
            for s in settlements
        ]

        child_invoices = (
            db.query(Invoice)
            .filter(Invoice.parent_invoice_id == invoice.id)
            .order_by(Invoice.id.asc())
            .all()
        )
        summary['linked_bills'] = [
            {
                'id': ch.id,
                'invoice_number': ch.invoice_number,
                'date': ch.invoice_date.isoformat(),
                'type': (
                    'RETURN'
                    if (ch.payment_status or '') == 'RETURN'
                    else ('CANCELLED' if ch.status == InvoiceStatus.CANCELLED else 'SETTLEMENT')
                ),
                'amount': float(ch.grand_total),
                'payment_method': ch.payment_method.value,
                'payment_status': ch.payment_status,
                'notes': ch.notes,
            }
            for ch in child_invoices
        ]

        if invoice.parent_invoice_id:
            parent_inv = db.query(Invoice).filter(Invoice.id == invoice.parent_invoice_id).first()
            if parent_inv:
                summary['parent_invoice_number'] = parent_inv.invoice_number

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
            q = q.filter(
                (Invoice.invoice_number.like(f'%{clean_search}%'))
                | (Invoice.customer_name.like(f'%{clean_search}%'))
                | (Invoice.customer_phone.like(f'%{clean_search}%'))
            )

        now = utcnow()
        if date_filter == 'today':
            today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
            today_end = datetime(now.year, now.month, now.day, 23, 59, 59, tzinfo=timezone.utc)
            q = q.filter(Invoice.invoice_date >= today_start, Invoice.invoice_date <= today_end)
        else:
            if start_date:
                try:
                    s_dt = datetime.strptime(start_date.strip(), '%Y-%m-%d').replace(tzinfo=timezone.utc)
                    q = q.filter(Invoice.invoice_date >= s_dt)
                except ValueError:
                    pass
            if end_date:
                try:
                    e_dt = datetime.strptime(end_date.strip(), '%Y-%m-%d').replace(
                        hour=23, minute=59, second=59, tzinfo=timezone.utc
                    )
                    q = q.filter(Invoice.invoice_date <= e_dt)
                except ValueError:
                    pass

        invoices = q.order_by(Invoice.created_at.desc(), Invoice.id.desc()).all()
        inv_ids = [inv.id for inv in invoices]

        cancelled_parents = get_cancelled_parent_ids(db, inv_ids)
        settlement_info_map = build_credit_settlement_info_map(db, inv_ids)
        return_summary_map = build_return_summary_map(db, inv_ids)

        result = [
            serialize_invoice_summary(
                invoice,
                cancelled_parent_ids=cancelled_parents,
                settlement_info_map=settlement_info_map,
                return_summary_map=return_summary_map,
            )
            for invoice in invoices
        ]
    finally:
        db.close()
    return result


@app.get('/invoices/export')
def export_invoices_csv(
    search: str | None = Query(None),
    date_filter: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    user: User = Depends(get_current_user),
) -> Response:
    invoices = list_invoices(
        search=search,
        date_filter=date_filter,
        start_date=start_date,
        end_date=end_date,
        user=user,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            'Invoice Number',
            'Date',
            'Customer Name',
            'Customer Phone',
            'Payment Method',
            'Payment Status',
            'Subtotal (₹)',
            'Discount (₹)',
            'Tax (₹)',
            'Grand Total (₹)',
            'Paid Amount (₹)',
            'Returned Amount (₹)',
            'Balance Due (₹)',
            'Status',
            'Cashier',
        ]
    )
    for inv in invoices:
        writer.writerow(
            [
                inv['invoice_number'],
                inv['date'],
                inv.get('customer_name') or '-',
                inv.get('customer_phone') or '-',
                inv['payment_method'],
                inv.get('payment_status') or '-',
                inv['subtotal'],
                inv['discount'],
                inv['tax_amount'],
                inv['grand_total'],
                inv.get('paid_amount', 0.0),
                inv.get('returned_amount', 0.0),
                inv.get('balance_due', 0.0),
                inv['status'],
                inv['created_by_name'],
            ]
        )

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="invoices_report.csv"'},
    )


@app.get('/invoices/{invoice_id}')
def get_invoice(invoice_id: int, user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Invoice not found')
        result = serialize_invoice_detail(invoice, db=db)
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
                detail='This bill is already a cancelled record.',
            )

        if invoice.parent_invoice_id is not None or (invoice.payment_status or '') in (
            'RETURN',
            'UDHARI_PAID',
            'UDHARI_PARTIAL_PAID',
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='या प्रकारचे परत/जमा संलग्न बिल थेट रद्द करता येत नाही (Cannot cancel a linked return or settlement bill).',
            )

        existing_cancel = (
            db.query(Invoice)
            .filter(
                Invoice.parent_invoice_id == invoice.id,
                Invoice.status == InvoiceStatus.CANCELLED,
            )
            .first()
        )
        if existing_cancel is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Bill {invoice.invoice_number} was already cancelled via {existing_cancel.invoice_number}.',
            )

        if invoice.invoice_items and all(
            float(getattr(item, 'returned_quantity', 0) or 0) >= float(item.quantity or 0) - 1e-6
            for item in invoice.invoice_items
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='या बिलामधील सर्व वस्तू आधीच परत केल्या आहेत, त्यामुळे हे बिल रद्द करता येणार नाही (All items already returned).',
            )

        s_map = build_credit_settlement_info_map(db, [invoice.id])
        r_map = build_return_summary_map(db, [invoice.id])
        acct = compute_invoice_accounting(invoice, settlement_info_map=s_map, return_summary_map=r_map)
        customer_cash_refund = acct['net_paid_amount']

        store_settings = db.query(StoreSettings).first()
        prefix = (store_settings.invoice_prefix if store_settings else 'INV').strip() or 'INV'
        latest_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
        sequence = int((latest_invoice.id if latest_invoice else 0)) + 1
        new_cancel_number = f'{prefix}-{sequence:06d}'
        now = utcnow()

        cancel_note = f'बिल रद्द नोंद (मूळ बिल: {invoice.invoice_number}) | Cancelled Bill for {invoice.invoice_number}'
        if customer_cash_refund > 0:
            cancel_note += f' | ग्राहकास परतावा: ₹{customer_cash_refund:.2f}'

        # Append-only immutable bill history: keep original `invoice` untouched,
        # and insert a new Invoice record with status=CANCELLED and current timestamp.
        cancelled_bill = Invoice(
            invoice_number=new_cancel_number,
            invoice_date=now,
            subtotal=invoice.subtotal,
            discount=invoice.discount,
            tax_amount=invoice.tax_amount,
            taxable_amount=invoice.taxable_amount,
            cgst_amount=invoice.cgst_amount,
            sgst_amount=invoice.sgst_amount,
            grand_total=invoice.grand_total,
            paid_amount=0.0,
            balance_due=0.0,
            payment_method=invoice.payment_method,
            payment_status='CANCELLED',
            status=InvoiceStatus.CANCELLED,
            parent_invoice_id=invoice.id,
            created_by=user.id,
            created_at=now,
            customer_name=invoice.customer_name,
            customer_phone=invoice.customer_phone,
            payment_reference=invoice.invoice_number,
            notes=cancel_note,
        )
        db.add(cancelled_bill)
        db.flush()

        for item in invoice.invoice_items:
            sold_q = Decimal(str(item.quantity or 0))
            prev_ret_q = Decimal(str(getattr(item, 'returned_quantity', 0) or 0))
            unreturned_q = max(Decimal('0'), sold_q - prev_ret_q)

            copied_item = InvoiceItem(
                invoice_id=cancelled_bill.id,
                product_id=item.product_id,
                product_name_mr=item.product_name_mr,
                quantity=float(unreturned_q),
                returned_quantity=float(unreturned_q),
                unit_price=item.unit_price,
                discount=item.discount,
                gst_rate=item.gst_rate,
                tax_amount=item.tax_amount,
                total=item.total,
            )
            db.add(copied_item)

            if item.product_id is not None and unreturned_q > Decimal('0'):
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product is not None:
                    product.current_stock = int(Decimal(str(product.current_stock)) + unreturned_q)

                return_movement = StockMovement(
                    product_id=item.product_id,
                    type=StockMovementType.RETURN,
                    quantity=float(unreturned_q),
                    reference_id=new_cancel_number,
                    created_at=now,
                )
                db.add(return_movement)

        log_audit(
            db,
            'CANCEL_INVOICE',
            user.id,
            f'Created cancelled bill {new_cancel_number} for original bill {invoice.invoice_number} (Cash refund: ₹{customer_cash_refund:.2f})',
        )
        db.commit()
        db.refresh(cancelled_bill)
        result = serialize_invoice_detail(cancelled_bill, db=db)
        result['cash_refund'] = customer_cash_refund
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Failed to cancel invoice: {exc}',
        ) from exc
    finally:
        db.close()
    return result


@app.post('/invoices/{invoice_id}/return-items')
def return_invoice_items(
    invoice_id: int,
    payload: InvoiceReturnRequest,
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Bill not found.')
        if invoice.status == InvoiceStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot return items from a cancelled bill.')
        if invoice.parent_invoice_id is not None or (invoice.payment_status or '') in (
            'RETURN',
            'UDHARI_PAID',
            'UDHARI_PARTIAL_PAID',
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='संलग्न परत किंवा उधारी जमा बिलामधून वस्तू परत करता येत नाहीत (Cannot return items from a linked child bill).',
            )

        existing_cancel = (
            db.query(Invoice)
            .filter(Invoice.parent_invoice_id == invoice.id, Invoice.status == InvoiceStatus.CANCELLED)
            .first()
        )
        if existing_cancel is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'रद्द केलेल्या बिलामधून वस्तू परत घेता येत नाहीत (Cancelled via {existing_cancel.invoice_number}).',
            )

        now = utcnow()
        inv_dt = invoice.created_at or invoice.invoice_date
        if inv_dt.tzinfo is None:
            inv_dt = inv_dt.replace(tzinfo=timezone.utc)
        elapsed_hours = (now - inv_dt).total_seconds() / 3600.0
        if elapsed_hours > 7.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='हे बिल तयार होऊन ७ तास उलटले आहेत. त्यामुळे या बिलामधील वस्तू आता परत घेता येणार नाहीत (Non-refundable after 7 hours).',
            )

        reason_str = (payload.reason or '').strip()
        if len(reason_str) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='वस्तू परत करण्याचे कारण (किमान ३ अक्षरे) प्रविष्ट करणे अनिवार्य आहे.',
            )

        # Compute pre-return balance & paid state cleanly before modifying returned_quantity
        s_map = build_credit_settlement_info_map(db, [invoice.id])
        r_map = build_return_summary_map(db, [invoice.id])
        pre_return_acct = compute_invoice_accounting(invoice, settlement_info_map=s_map, return_summary_map=r_map)

        prior_returns = (
            db.query(Invoice)
            .filter(
                Invoice.parent_invoice_id == invoice.id,
                Invoice.payment_status == 'RETURN',
                Invoice.status == InvoiceStatus.COMPLETED,
            )
            .all()
        )
        prior_return_discount_sum = sum(Decimal(str(r.discount or 0.0)) for r in prior_returns)
        prior_return_grand_sum = sum(Decimal(str(r.grand_total or 0.0)) for r in prior_returns)

        items_subtotal_sum = sum(Decimal(str(i.total or 0)) for i in invoice.invoice_items)
        orig_subtotal = Decimal(str(invoice.subtotal or 0))
        discount_base_subtotal = items_subtotal_sum if items_subtotal_sum > Decimal('0.00') else orig_subtotal
        orig_bill_discount = Decimal(str(invoice.discount or 0.0))
        orig_grand_total = Decimal(str(invoice.grand_total or 0.0))

        store_settings = db.query(StoreSettings).first()
        is_tax_inclusive = store_settings.tax_inclusive if store_settings else True

        prefix = (store_settings.invoice_prefix if store_settings else 'INV').strip() or 'INV'
        latest_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
        sequence = int((latest_invoice.id if latest_invoice else 0)) + 1
        return_invoice_number = f'{prefix}-{sequence:06d}'

        returned_items_records: list[dict[str, Any]] = []
        total_return_subtotal = Decimal('0.00')
        total_return_taxable = Decimal('0.00')
        total_return_tax = Decimal('0.00')

        for req_item in payload.items:
            inv_item = (
                db.query(InvoiceItem)
                .filter(InvoiceItem.id == req_item.invoice_item_id, InvoiceItem.invoice_id == invoice.id)
                .first()
            )
            if inv_item is None:
                continue

            ret_qty = Decimal(str(req_item.return_quantity))
            sold_qty = Decimal(str(inv_item.quantity))
            prev_returned = Decimal(str(getattr(inv_item, 'returned_quantity', 0) or 0))
            available_to_return = max(Decimal('0'), sold_qty - prev_returned)

            if ret_qty <= Decimal('0') or ret_qty > available_to_return:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f'Invalid return quantity for {inv_item.product_name_mr}. Available to return: {available_to_return}',
                )

            unit_price = Decimal(str(inv_item.unit_price))
            gst_rate = Decimal(str(inv_item.gst_rate or 0))
            disc_per_unit = (Decimal(str(inv_item.discount or 0)) / sold_qty) if sold_qty > 0 else Decimal('0')
            line_discount = (disc_per_unit * ret_qty).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            raw_line = max(Decimal('0.00'), (unit_price * ret_qty) - line_discount)

            if is_tax_inclusive:
                if gst_rate > Decimal('0'):
                    line_taxable = (raw_line / (Decimal('1.00') + (gst_rate / Decimal('100.00')))).quantize(
                        Decimal('0.01'), rounding=ROUND_HALF_UP
                    )
                    line_tax = raw_line - line_taxable
                else:
                    line_taxable = raw_line
                    line_tax = Decimal('0.00')
                line_total = raw_line
            else:
                line_taxable = raw_line
                line_tax = (line_taxable * (gst_rate / Decimal('100.00'))).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                line_total = line_taxable + line_tax

            # Update original line's audit returned counter (quantity stays original!)
            inv_item.returned_quantity = float(prev_returned + ret_qty)

            # Restore stock
            if inv_item.product_id is not None:
                product = db.query(Product).filter(Product.id == inv_item.product_id).first()
                if product is not None:
                    product.current_stock = int(Decimal(str(product.current_stock)) + ret_qty)

                db.add(
                    StockMovement(
                        product_id=inv_item.product_id,
                        type=StockMovementType.RETURN,
                        quantity=float(ret_qty),
                        reference_id=return_invoice_number,
                        created_at=now,
                    )
                )

            total_return_subtotal += line_total
            total_return_taxable += line_taxable
            total_return_tax += line_tax

            returned_items_records.append({
                'product_id': inv_item.product_id,
                'product_name_mr': inv_item.product_name_mr,
                'quantity': float(ret_qty),
                'unit_price': float(unit_price),
                'discount': float(line_discount),
                'gst_rate': float(gst_rate),
                'tax_amount': round_cur(line_tax),
                'total': round_cur(line_total),
            })

        if not returned_items_records:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No valid items selected for return.')

        # Apportion parent bill-level discount accurately across returns
        db.flush()
        is_final_complete_return = bool(invoice.invoice_items) and all(
            Decimal(str(getattr(i, 'returned_quantity', 0) or 0)) >= Decimal(str(i.quantity or 0)) - Decimal('0.0001')
            for i in invoice.invoice_items
        )

        if orig_bill_discount > Decimal('0.00') and discount_base_subtotal > Decimal('0.00'):
            if is_final_complete_return:
                remaining_disc_cap = max(Decimal('0.00'), orig_bill_discount - prior_return_discount_sum)
                remaining_grand_cap = max(Decimal('0.00'), orig_grand_total - prior_return_grand_sum)
                return_bill_discount = min(total_return_subtotal, remaining_disc_cap)
                total_return_grand = remaining_grand_cap
            else:
                raw_disc_share = (
                    orig_bill_discount * (total_return_subtotal / discount_base_subtotal)
                ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                remaining_disc_cap = max(Decimal('0.00'), orig_bill_discount - prior_return_discount_sum)
                return_bill_discount = min(total_return_subtotal, raw_disc_share, remaining_disc_cap)
                total_return_grand = max(Decimal('0.00'), total_return_subtotal - return_bill_discount)
        else:
            return_bill_discount = Decimal('0.00')
            total_return_grand = total_return_subtotal

        # Scale GST & Taxable amounts proportionally when bill-level discount applies
        if return_bill_discount > Decimal('0.00') and total_return_subtotal > Decimal('0.00'):
            disc_ratio = total_return_grand / total_return_subtotal
            adj_return_tax = (total_return_tax * disc_ratio).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            adj_return_taxable = max(Decimal('0.00'), total_return_grand - adj_return_tax)
        else:
            adj_return_tax = total_return_tax
            adj_return_taxable = total_return_taxable

        return_cgst = (adj_return_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return_sgst = adj_return_tax - return_cgst

        # Udhari deduction vs Customer Cash/UPI Refund calculation
        is_credit = invoice.payment_method == PaymentMethod.CREDIT
        total_grd = round_cur(total_return_grand)
        udhari_deducted = 0.0
        cash_refund = total_grd

        if is_credit:
            current_balance_due = float(pre_return_acct['balance_due'])
            current_net_paid = float(pre_return_acct['net_paid_amount'])
            udhari_deducted = round_cur(min(total_grd, current_balance_due))
            cash_refund = round_cur(min(current_net_paid, max(0.0, total_grd - udhari_deducted)))
            new_balance = round_cur(max(0.0, current_balance_due - udhari_deducted))
            remaining_paid_after_refund = round_cur(max(0.0, current_net_paid - cash_refund))
            invoice.balance_due = new_balance
            if new_balance <= 0.01:
                invoice.payment_status = 'PAID'
            elif remaining_paid_after_refund > 0.0:
                invoice.payment_status = 'PARTIAL'
            else:
                invoice.payment_status = 'CREDIT_DUE'

        note_str = f'वस्तू परत नोंद (मूळ बिल: {invoice.invoice_number}) | कारण: {reason_str}'
        if is_credit:
            note_str += f' | उधारी वजावट: ₹{udhari_deducted:.2f}, ग्राहकास परतावा: ₹{cash_refund:.2f}'
        else:
            note_str += f' | ग्राहकास परतावा: ₹{cash_refund:.2f}'

        # Create brand-new return bill (Append-only immutable architecture)
        total_sub = round_cur(total_return_subtotal)
        total_disc = round_cur(return_bill_discount)
        total_tax_cur = round_cur(adj_return_tax)
        return_bill = Invoice(
            invoice_number=return_invoice_number,
            invoice_date=now,
            subtotal=total_sub,
            discount=total_disc,
            tax_amount=total_tax_cur,
            taxable_amount=round_cur(adj_return_taxable),
            cgst_amount=round_cur(return_cgst),
            sgst_amount=round_cur(return_sgst),
            grand_total=total_grd,
            paid_amount=cash_refund,
            balance_due=0.0,
            payment_method=invoice.payment_method,
            payment_status='RETURN',
            status=InvoiceStatus.COMPLETED,
            parent_invoice_id=invoice.id,
            created_by=user.id,
            created_at=now,
            customer_name=invoice.customer_name,
            customer_phone=invoice.customer_phone,
            payment_reference=invoice.invoice_number,
            notes=note_str,
        )
        db.add(return_bill)
        db.flush()

        for item_data in returned_items_records:
            db.add(
                InvoiceItem(
                    invoice_id=return_bill.id,
                    product_id=item_data['product_id'],
                    product_name_mr=item_data['product_name_mr'],
                    quantity=item_data['quantity'],
                    returned_quantity=item_data['quantity'],
                    unit_price=item_data['unit_price'],
                    discount=item_data['discount'],
                    gst_rate=item_data['gst_rate'],
                    tax_amount=item_data['tax_amount'],
                    total=item_data['total'],
                )
            )

        log_audit(
            db,
            'PARTIAL_RETURN_INVOICE',
            user.id,
            f'Created return bill {return_invoice_number} (₹{total_grd:.2f}) for {invoice.invoice_number} | Udhari deducted: ₹{udhari_deducted:.2f}, Cash refund: ₹{cash_refund:.2f}',
        )
        db.commit()
        db.refresh(return_bill)
        db.refresh(invoice)

        return {
            'return_invoice': serialize_invoice_detail(return_bill, db=db),
            'original_invoice': serialize_invoice_detail(invoice, db=db),
            'cash_refund': cash_refund,
            'udhari_deducted': udhari_deducted,
            'new_balance': float(invoice.balance_due or 0.0),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Return failed: {exc}') from exc
    finally:
        db.close()


@app.get('/credits')
def list_credit_accounts(user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        cancelled_parents = get_cancelled_parent_ids(db)
        credit_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.payment_method == PaymentMethod.CREDIT,
                Invoice.status == InvoiceStatus.COMPLETED,
                Invoice.parent_invoice_id.is_(None),
                or_(
                    Invoice.payment_status.is_(None),
                    ~Invoice.payment_status.in_(['RETURN', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID']),
                ),
            )
            .order_by(Invoice.created_at.desc(), Invoice.id.desc())
            .all()
        )
        credit_ids = [inv.id for inv in credit_invoices]
        settlement_info_map = build_credit_settlement_info_map(db, credit_ids)
        return_summary_map = build_return_summary_map(db, credit_ids)

        now = utcnow()
        result = []
        for inv in credit_invoices:
            if inv.id in cancelled_parents:
                continue
            summary = serialize_invoice_summary(
                inv,
                cancelled_parent_ids=cancelled_parents,
                settlement_info_map=settlement_info_map,
                return_summary_map=return_summary_map,
            )
            inv_dt = inv.invoice_date
            if inv_dt.tzinfo is None:
                inv_dt = inv_dt.replace(tzinfo=timezone.utc)
            days_pending = max(0, (now - inv_dt).days)
            result.append(
                {
                    **summary,
                    'days_pending': days_pending,
                    'is_settled': summary['balance_due'] <= 0.01,
                }
            )
        return result
    finally:
        db.close()


@app.post('/credits/{invoice_id}/settle')
def settle_credit_invoice(
    invoice_id: int,
    payload: CreditSettleRequest,
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if inv is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Bill not found.')
        if inv.payment_method != PaymentMethod.CREDIT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only Udhari (Credit) bills can be settled.')
        if inv.status == InvoiceStatus.CANCELLED or inv.parent_invoice_id is not None or (inv.payment_status or '') in (
            'RETURN',
            'UDHARI_PAID',
            'UDHARI_PARTIAL_PAID',
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot settle a cancelled or linked child bill.')

        existing_cancel = (
            db.query(Invoice)
            .filter(Invoice.parent_invoice_id == inv.id, Invoice.status == InvoiceStatus.CANCELLED)
            .first()
        )
        if existing_cancel is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Cancelled bill ({existing_cancel.invoice_number}) cannot be settled.',
            )

        s_map = build_credit_settlement_info_map(db, [inv.id])
        r_map = build_return_summary_map(db, [inv.id])
        acct = compute_invoice_accounting(inv, settlement_info_map=s_map, return_summary_map=r_map)
        remaining = float(acct['balance_due'])

        if remaining <= 0.01:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='This credit bill is already settled.')

        pay_amt = round_cur(min(float(payload.amount), remaining))
        if pay_amt <= 0.0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Settlement amount must be greater than zero.')

        now = utcnow()
        ref_note = (payload.reference_note or payload.note or '').strip() or None
        pay_mode_str = (payload.payment_mode or 'CASH').upper()
        if pay_mode_str not in ('CASH', 'UPI', 'CARD'):
            pay_mode_str = 'CASH'

        settlement = CreditSettlement(
            invoice_id=inv.id,
            amount=pay_amt,
            payment_mode=pay_mode_str,
            reference_note=ref_note,
            recorded_by=user.id,
            settled_at=now,
        )
        db.add(settlement)
        new_balance = round_cur(max(0.0, remaining - pay_amt))
        inv.balance_due = new_balance
        inv.payment_status = 'PAID' if new_balance <= 0.01 else 'PARTIAL'

        # Append-only immutable bill history: keep original Udhari bill `inv` untouched (except credit ledger status/balance),
        # and create a brand-new Bill with a new sequential Bill ID and status UDHARI_PAID.
        store_settings = db.query(StoreSettings).first()
        prefix = (store_settings.invoice_prefix if store_settings else 'INV').strip() or 'INV'
        latest_invoice = db.query(Invoice).order_by(Invoice.id.desc()).first()
        sequence = int((latest_invoice.id if latest_invoice else 0)) + 1
        settlement_bill_number = f'{prefix}-{sequence:06d}'

        status_tag = 'UDHARI_PAID' if new_balance <= 0.01 else 'UDHARI_PARTIAL_PAID'
        note_text = f'उधारी जमा बिल (मूळ बिल: {inv.invoice_number}) | Udhari Paid for {inv.invoice_number}'
        if ref_note:
            note_text = f'{note_text} • {ref_note}'

        settlement_invoice = Invoice(
            invoice_number=settlement_bill_number,
            invoice_date=now,
            subtotal=pay_amt,
            discount=0.0,
            tax_amount=0.0,
            taxable_amount=pay_amt,
            cgst_amount=0.0,
            sgst_amount=0.0,
            grand_total=pay_amt,
            paid_amount=pay_amt,
            balance_due=new_balance,
            payment_method=PaymentMethod(pay_mode_str),
            payment_status=status_tag,
            status=InvoiceStatus.COMPLETED,
            parent_invoice_id=inv.id,
            created_by=user.id,
            created_at=now,
            customer_name=inv.customer_name,
            customer_phone=inv.customer_phone,
            payment_reference=inv.invoice_number,
            notes=note_text,
        )
        db.add(settlement_invoice)
        db.flush()

        fallback_product_id = (
            inv.invoice_items[0].product_id
            if inv.invoice_items and inv.invoice_items[0].product_id
            else (db.query(Product.id).first() or [None])[0]
        )
        settlement_item = InvoiceItem(
            invoice_id=settlement_invoice.id,
            product_id=fallback_product_id,
            product_name_mr=f'उधारी जमा ({inv.invoice_number})',
            quantity=1,
            returned_quantity=0,
            unit_price=pay_amt,
            discount=0.0,
            gst_rate=0.0,
            tax_amount=0.0,
            total=pay_amt,
        )
        db.add(settlement_item)

        log_audit(
            db,
            'SETTLE_CREDIT_INVOICE',
            user.id,
            f'Created new Udhari settlement bill {settlement_bill_number} (₹{pay_amt}) for {inv.invoice_number} (Remaining: ₹{new_balance})',
        )
        db.commit()
        db.refresh(settlement_invoice)
        return {
            'invoice_id': inv.id,
            'invoice_number': inv.invoice_number,
            'settlement_invoice_id': settlement_invoice.id,
            'settlement_invoice_number': settlement_invoice.invoice_number,
            'settlement_invoice': serialize_invoice_detail(settlement_invoice, db=db),
            'paid_now': pay_amt,
            'balance_due': new_balance,
            'payment_status': 'PAID' if new_balance <= 0.01 else 'PARTIAL',
        }
    finally:
        db.close()


@app.get('/admin/database/backup')
def download_sqlite_backup(user: User = Depends(require_role(UserRole.ADMIN.value))) -> Response:
    resolved_url = get_resolved_database_url(settings.database_url)
    if not resolved_url.startswith('sqlite:///'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Direct file backup is supported for SQLite databases. For PostgreSQL, use pg_dump.',
        )
    db_path = Path(resolved_url.replace('sqlite:///', '', 1))
    if not db_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Database file not found.')

    backup_dir = BACKEND_DIR / 'data' / 'backups'
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f'store_backup_{stamp}.db'

    src_conn = sqlite3.connect(str(db_path))
    dst_conn = sqlite3.connect(str(backup_file))
    try:
        src_conn.backup(dst_conn)
    finally:
        dst_conn.close()
        src_conn.close()

    content = backup_file.read_bytes()
    return Response(
        content=content,
        media_type='application/octet-stream',
        headers={
            'Content-Disposition': f'attachment; filename="store_backup_{stamp}.db"',
        },
    )


@app.get('/bills')
def list_bills(user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    return list_invoices(user=user)


# ── Dashboard & Reporting Endpoints ───────────────────────────────────


@app.get('/api/dashboard/stats')
def get_dashboard_stats(user: User = Depends(get_current_user)) -> dict[str, Any]:
    db: Session = SessionLocal()
    try:
        now = utcnow()
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        today_end = datetime(now.year, now.month, now.day, 23, 59, 59, tzinfo=timezone.utc)

        cancelled_parents = get_cancelled_parent_ids(db)
        settlement_info_map = build_credit_settlement_info_map(db)
        return_summary_map = build_return_summary_map(db)

        # Today's completed bills (excluding cancelled parents and child settlements; subtract returns)
        today_invoices_raw = (
            db.query(Invoice)
            .filter(
                Invoice.status == InvoiceStatus.COMPLETED,
                Invoice.invoice_date >= today_start,
                Invoice.invoice_date <= today_end,
            )
            .all()
        )
        today_sales_invoices = [
            inv
            for inv in today_invoices_raw
            if inv.id not in cancelled_parents
            and inv.parent_invoice_id is None
            and (inv.payment_status or '') not in ('UDHARI_PAID', 'UDHARI_PARTIAL_PAID', 'RETURN')
        ]
        today_return_invoices = [
            inv
            for inv in today_invoices_raw
            if (inv.payment_status or '') == 'RETURN'
            and (inv.parent_invoice_id not in cancelled_parents)
        ]

        today_gross_sales = sum(float(inv.grand_total or 0.0) for inv in today_sales_invoices)
        today_returns_total = sum(float(ret.grand_total or 0.0) for ret in today_return_invoices)
        today_sales = round_cur(max(0.0, today_gross_sales - today_returns_total))
        today_bills_count = len(today_sales_invoices)

        # Payment methods breakdown for today (net of today's returns)
        payment_breakdown: dict[str, dict[str, Any]] = {
            'CASH': {'count': 0, 'amount': 0.0},
            'UPI': {'count': 0, 'amount': 0.0},
            'CARD': {'count': 0, 'amount': 0.0},
            'CREDIT': {'count': 0, 'amount': 0.0},
        }
        for inv in today_sales_invoices:
            pm = inv.payment_method.value
            if pm in payment_breakdown:
                payment_breakdown[pm]['count'] += 1
                payment_breakdown[pm]['amount'] = round_cur(
                    payment_breakdown[pm]['amount'] + float(inv.grand_total or 0.0)
                )
        for ret in today_return_invoices:
            pm = ret.payment_method.value
            if pm in payment_breakdown:
                payment_breakdown[pm]['amount'] = round_cur(
                    max(0.0, payment_breakdown[pm]['amount'] - float(ret.grand_total or 0.0))
                )

        # Products count and low stock items
        all_active_products = db.query(Product).filter(Product.is_active.is_(True)).all()
        total_products_count = len(all_active_products)
        low_stock_products = [
            serialize_product(p) for p in all_active_products if p.current_stock <= p.low_stock_level
        ]

        # Pending Udhari (Credit) calculation: sorted by Longest Pending Time & Highest Balance Due first
        all_credit_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.payment_method == PaymentMethod.CREDIT,
                Invoice.status == InvoiceStatus.COMPLETED,
                Invoice.parent_invoice_id.is_(None),
                or_(
                    Invoice.payment_status.is_(None),
                    ~Invoice.payment_status.in_(['RETURN', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID']),
                ),
            )
            .all()
        )
        pending_udhari_list: list[dict[str, Any]] = []
        total_udhari_due = 0.0
        for inv in all_credit_invoices:
            if inv.id in cancelled_parents:
                continue
            summary = serialize_invoice_summary(
                inv,
                cancelled_parent_ids=cancelled_parents,
                settlement_info_map=settlement_info_map,
                return_summary_map=return_summary_map,
            )
            bal_due = float(summary['balance_due'])
            if bal_due > 0.01:
                total_udhari_due = round_cur(total_udhari_due + bal_due)
                inv_dt = inv.invoice_date
                if inv_dt.tzinfo is None:
                    inv_dt = inv_dt.replace(tzinfo=timezone.utc)
                age_seconds = max(0.0, (now - inv_dt).total_seconds())
                days_pending = int(age_seconds // 86400)
                pending_udhari_list.append(
                    {
                        **summary,
                        'days_pending': days_pending,
                        '_age_seconds': age_seconds,
                    }
                )

        # Sort by Highest Udhari Amount & Longest Pending Time (Oldest Date First)
        pending_udhari_list.sort(
            key=lambda x: (x['balance_due'], x['_age_seconds']),
            reverse=True,
        )
        for item in pending_udhari_list:
            item.pop('_age_seconds', None)

        # Recent 8 invoices
        recent_invoices = (
            db.query(Invoice)
            .order_by(Invoice.created_at.desc(), Invoice.id.desc())
            .limit(8)
            .all()
        )

        # 7-day sales trend (net of same-day returns)
        daily_trend = []
        for d in range(6, -1, -1):
            day_target = now - timedelta(days=d)
            start_d = datetime(day_target.year, day_target.month, day_target.day, 0, 0, 0, tzinfo=timezone.utc)
            end_d = datetime(day_target.year, day_target.month, day_target.day, 23, 59, 59, tzinfo=timezone.utc)
            day_invs = (
                db.query(Invoice)
                .filter(
                    Invoice.status == InvoiceStatus.COMPLETED,
                    Invoice.invoice_date >= start_d,
                    Invoice.invoice_date <= end_d,
                )
                .all()
            )
            valid_day_sales = [
                i
                for i in day_invs
                if i.id not in cancelled_parents
                and i.parent_invoice_id is None
                and (i.payment_status or '') not in ('UDHARI_PAID', 'UDHARI_PARTIAL_PAID', 'RETURN')
            ]
            valid_day_returns = [
                i
                for i in day_invs
                if (i.payment_status or '') == 'RETURN'
                and (i.parent_invoice_id not in cancelled_parents)
            ]
            day_sales_total = max(
                0.0,
                sum(float(i.grand_total or 0.0) for i in valid_day_sales)
                - sum(float(r.grand_total or 0.0) for r in valid_day_returns),
            )
            daily_trend.append(
                {
                    'date': day_target.strftime('%Y-%m-%d'),
                    'day_name': day_target.strftime('%a'),
                    'sales': round_cur(day_sales_total),
                    'count': len(valid_day_sales),
                }
            )

        return {
            'today_sales': round_cur(today_sales),
            'today_bills_count': today_bills_count,
            'total_products_count': total_products_count,
            'low_stock_count': len(low_stock_products),
            'low_stock_products': low_stock_products[:10],
            'total_udhari_due': round_cur(total_udhari_due),
            'udhari_bills_count': len(pending_udhari_list),
            'priority_udhari_bills': pending_udhari_list[:10],
            'payment_breakdown': payment_breakdown,
            'recent_invoices': [
                serialize_invoice_summary(
                    inv,
                    cancelled_parent_ids=cancelled_parents,
                    settlement_info_map=settlement_info_map,
                    return_summary_map=return_summary_map,
                )
                for inv in recent_invoices
            ],
            'daily_trend': daily_trend,
        }
    finally:
        db.close()


def reconcile_legacy_accounting_data() -> None:
    """Idempotent startup repair for historical return bills and credit balances."""
    db: Session = SessionLocal()
    try:
        all_returns = (
            db.query(Invoice)
            .filter(
                Invoice.parent_invoice_id.is_not(None),
                Invoice.payment_status == 'RETURN',
                Invoice.status == InvoiceStatus.COMPLETED,
            )
            .order_by(Invoice.id.asc())
            .all()
        )
        returns_by_parent: dict[int, list[Invoice]] = {}
        for r in all_returns:
            if r.parent_invoice_id is not None:
                returns_by_parent.setdefault(int(r.parent_invoice_id), []).append(r)

        if returns_by_parent:
            s_map = build_credit_settlement_info_map(db, list(returns_by_parent.keys()))
            for pid, ret_list in returns_by_parent.items():
                parent = db.query(Invoice).filter(Invoice.id == pid).first()
                if parent is None:
                    continue
                p_sub = Decimal(str(parent.subtotal or 0.0))
                p_disc = Decimal(str(parent.discount or 0.0))
                p_grand = Decimal(str(parent.grand_total or 0.0))

                if parent.payment_method == PaymentMethod.CREDIT:
                    s_info = s_map.get(pid)
                    p_total_cur = round_cur(p_grand)
                    if s_info:
                        settled_sum = float(s_info.get('total_settled', 0.0))
                        if s_info.get('has_initial_record'):
                            gross_paid = round_cur(min(p_total_cur, settled_sum))
                        else:
                            gross_paid = round_cur(min(p_total_cur, float(parent.paid_amount or 0.0) + settled_sum))
                    else:
                        gross_paid = round_cur(min(p_total_cur, float(parent.paid_amount or 0.0)))
                else:
                    gross_paid = round_cur(p_grand)

                returned_so_far = 0.0
                disc_returned_so_far = 0.0
                refunded_so_far = 0.0

                for ret in ret_list:
                    r_sub = Decimal(str(ret.subtotal or 0.0))
                    # Repair missing bill-discount apportionment if parent was discounted
                    if p_disc > Decimal('0.00') and float(ret.discount or 0.0) == 0.0 and p_sub > Decimal('0.00'):
                        cum_sub = Decimal(str(returned_so_far)) + Decimal(str(disc_returned_so_far)) + r_sub
                        if abs(cum_sub - p_sub) <= Decimal('0.05'):
                            new_disc = max(Decimal('0.00'), p_disc - Decimal(str(disc_returned_so_far)))
                            new_grand = max(Decimal('0.00'), p_grand - Decimal(str(returned_so_far)))
                        else:
                            new_disc = (p_disc * (r_sub / p_sub)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                            new_disc = min(r_sub, new_disc, max(Decimal('0.00'), p_disc - Decimal(str(disc_returned_so_far))))
                            new_grand = max(Decimal('0.00'), r_sub - new_disc)

                        ret.discount = round_cur(new_disc)
                        ret.grand_total = round_cur(new_grand)
                        if new_disc > Decimal('0.00') and r_sub > Decimal('0.00'):
                            ratio = new_grand / r_sub
                            new_tax = (Decimal(str(ret.tax_amount or 0.0)) * ratio).quantize(
                                Decimal('0.01'), rounding=ROUND_HALF_UP
                            )
                            new_taxable = max(Decimal('0.00'), new_grand - new_tax)
                            cg = (new_tax / Decimal('2.00')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                            ret.tax_amount = round_cur(new_tax)
                            ret.taxable_amount = round_cur(new_taxable)
                            ret.cgst_amount = round_cur(cg)
                            ret.sgst_amount = round_cur(new_tax - cg)

                    r_grd = round_cur(float(ret.grand_total or 0.0))
                    if parent.payment_method == PaymentMethod.CREDIT:
                        eff_total_before = round_cur(max(0.0, float(p_grand) - returned_so_far))
                        net_paid_before = round_cur(max(0.0, gross_paid - refunded_so_far))
                        bal_before = round_cur(max(0.0, eff_total_before - net_paid_before))
                        u_ded = round_cur(min(r_grd, bal_before))
                        c_ref = round_cur(min(net_paid_before, max(0.0, r_grd - u_ded)))
                        ret.paid_amount = c_ref
                        ret.balance_due = 0.0
                        if ret.notes and '| उधारी वजावट:' in ret.notes:
                            base_note = ret.notes.split('| उधारी वजावट:', 1)[0].rstrip()
                            ret.notes = f'{base_note} | उधारी वजावट: ₹{u_ded:.2f}, ग्राहकास परतावा: ₹{c_ref:.2f}'
                    else:
                        c_ref = r_grd
                        ret.paid_amount = c_ref
                        ret.balance_due = 0.0

                    returned_so_far = round_cur(returned_so_far + r_grd)
                    disc_returned_so_far = round_cur(disc_returned_so_far + float(ret.discount or 0.0))
                    refunded_so_far = round_cur(refunded_so_far + c_ref)

        # Flush return repairs before syncing parent credit statuses
        db.flush()
        cancelled_parents = get_cancelled_parent_ids(db)
        credit_parents = (
            db.query(Invoice)
            .filter(
                Invoice.payment_method == PaymentMethod.CREDIT,
                Invoice.status == InvoiceStatus.COMPLETED,
                Invoice.parent_invoice_id.is_(None),
                or_(
                    Invoice.payment_status.is_(None),
                    ~Invoice.payment_status.in_(['RETURN', 'UDHARI_PAID', 'UDHARI_PARTIAL_PAID']),
                ),
            )
            .all()
        )
        if credit_parents:
            c_ids = [c.id for c in credit_parents]
            c_s_map = build_credit_settlement_info_map(db, c_ids)
            c_r_map = build_return_summary_map(db, c_ids)
            for inv in credit_parents:
                if inv.id in cancelled_parents:
                    continue
                acct = compute_invoice_accounting(
                    inv,
                    settlement_info_map=c_s_map,
                    return_summary_map=c_r_map,
                    cancelled_parent_ids=cancelled_parents,
                )
                inv.balance_due = acct['balance_due']
                inv.payment_status = acct['payment_status']

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


reconcile_legacy_accounting_data()


@app.get('/admin/audit-logs')
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(require_role(UserRole.ADMIN.value)),
) -> list[dict[str, Any]]:
    db: Session = SessionLocal()
    try:
        events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit).all()
        return [
            {
                'id': e.id,
                'action': e.action,
                'performed_by': e.performed_by,
                'details': e.details,
                'ip_address': e.ip_address,
                'created_at': e.created_at.isoformat(),
            }
            for e in events
        ]
    finally:
        db.close()


@app.get('/')
def read_root() -> dict[str, str]:
    return {'message': 'Store POS API running'}
