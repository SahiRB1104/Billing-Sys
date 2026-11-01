from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    ADMIN = 'ADMIN'
    CASHIER = 'CASHIER'


class PaymentMethod(str, Enum):
    CASH = 'CASH'
    UPI = 'UPI'
    CARD = 'CARD'
    CREDIT = 'CREDIT'


class InvoiceStatus(str, Enum):
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'


class StockMovementType(str, Enum):
    OPENING = 'OPENING'
    SALE = 'SALE'
    RETURN = 'RETURN'
    ADJUSTMENT = 'ADJUSTMENT'


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.CASHIER)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    # Extended staff fields
    contact_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    staff_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    joining_date: Mapped[str | None] = mapped_column(String(30), nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    document_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    document_status: Mapped[str | None] = mapped_column(String(30), default='PENDING', nullable=True)
    document_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    hard_copy_collected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    otp_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=True)

    invoices: Mapped[list['Invoice']] = relationship(back_populates='creator')
    product_price_history: Mapped[list['ProductPriceHistory']] = relationship(back_populates='changed_by_user')
    documents: Mapped[list['StaffDocument']] = relationship(back_populates='user', cascade='all, delete-orphan')


class StaffDocument(Base):
    __tablename__ = 'staff_documents'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(default=0, nullable=False)
    document_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    user: Mapped['User'] = relationship(back_populates='documents')


class StoreSettings(Base):
    __tablename__ = 'store_settings'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    store_name: Mapped[str] = mapped_column(String(200), default='श्री वैभव स्टोअर', nullable=False)
    owner_name: Mapped[str | None] = mapped_column(String(120), default='वैभव पाटील', nullable=True)
    address: Mapped[str | None] = mapped_column(Text, default='दुकान क्र. १२, मार्केट यार्ड, नवी पेठ', nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), default='सोलापूर', nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), default='महाराष्ट्र', nullable=True)
    pin_code: Mapped[str | None] = mapped_column(String(20), default='413002', nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), default='भारत', nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), default='+91 98765 43210', nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), default='vaibhav.store@gmail.com', nullable=True)
    gst_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(30), default='27ABCDE1234F1Z5', nullable=True)
    business_logo: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_prefix: Mapped[str] = mapped_column(String(20), default='INV', nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(10), default='₹', nullable=False)
    locale: Mapped[str] = mapped_column(String(20), default='mr-IN', nullable=False)
    receipt_header: Mapped[str | None] = mapped_column(Text, default='|| श्री गणेशाय नमः ||', nullable=True)
    receipt_footer: Mapped[str | None] = mapped_column(Text, default='धन्यवाद! पुन्हा भेट द्या.', nullable=True)
    tax_inclusive: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), default=5.0, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class PaymentSettings(Base):
    __tablename__ = 'payment_settings'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    upi_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payee_name: Mapped[str | None] = mapped_column(String(120), default='श्री वैभव स्टोअर', nullable=True)
    upi_id: Mapped[str | None] = mapped_column(String(100), default='vaibhavstore@upi', nullable=True)
    payment_description: Mapped[str | None] = mapped_column(String(200), default='Retail Store Payment', nullable=True)
    static_qr_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    gateway_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gateway_provider: Mapped[str | None] = mapped_column(String(50), default='MANUAL', nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AuditEvent(Base):
    __tablename__ = 'audit_events'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    performed_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Product(Base):
    __tablename__ = 'products'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    name_mr: Mapped[str] = mapped_column(String(200), nullable=False)
    category_mr: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unit_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pack_quantity: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    purchase_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    selling_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    mrp: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    current_stock: Mapped[int] = mapped_column(default=0)
    low_stock_level: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    invoice_items: Mapped[list['InvoiceItem']] = relationship(back_populates='product')
    stock_movements: Mapped[list['StockMovement']] = relationship(back_populates='product')
    price_history: Mapped[list['ProductPriceHistory']] = relationship(back_populates='product')


class Invoice(Base):
    __tablename__ = 'invoices'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    invoice_date: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    payment_method: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(SAEnum(InvoiceStatus), nullable=False, default=InvoiceStatus.COMPLETED)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    # Customer & extended payment fields
    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    taxable_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0, nullable=True)
    cgst_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0, nullable=True)
    sgst_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0, nullable=True)
    payment_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_status: Mapped[str | None] = mapped_column(String(30), default='PAID', nullable=True)
    paid_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0, nullable=True)
    balance_due: Mapped[float | None] = mapped_column(Numeric(12, 2), default=0, nullable=True)
    parent_invoice_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cash_tendered: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    change_returned: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    creator: Mapped['User'] = relationship(back_populates='invoices')
    invoice_items: Mapped[list['InvoiceItem']] = relationship(back_populates='invoice')


class InvoiceItem(Base):
    __tablename__ = 'invoice_items'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey('invoices.id'), nullable=False)
    product_id: Mapped[int | None] = mapped_column(ForeignKey('products.id'), nullable=True)
    product_name_mr: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    returned_quantity: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    invoice: Mapped['Invoice'] = relationship(back_populates='invoice_items')
    product: Mapped['Product'] = relationship(back_populates='invoice_items')


class CreditSettlement(Base):
    __tablename__ = 'credit_settlements'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey('invoices.id'), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_mode: Mapped[str] = mapped_column(String(30), default='CASH', nullable=False)
    reference_note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    settled_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class StockMovement(Base):
    __tablename__ = 'stock_movements'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    type: Mapped[StockMovementType] = mapped_column(SAEnum(StockMovementType), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    product: Mapped['Product'] = relationship(back_populates='stock_movements')


class ProductPriceHistory(Base):
    __tablename__ = 'product_price_history'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    old_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    changed_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    product: Mapped['Product'] = relationship(back_populates='price_history')
    changed_by_user: Mapped['User | None'] = relationship(back_populates='product_price_history')
