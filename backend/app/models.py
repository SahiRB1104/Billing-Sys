from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    invoices: Mapped[list['Invoice']] = relationship(back_populates='creator')
    product_price_history: Mapped[list['ProductPriceHistory']] = relationship(back_populates='changed_by_user')


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    invoice_items: Mapped[list['InvoiceItem']] = relationship(back_populates='product')
    stock_movements: Mapped[list['StockMovement']] = relationship(back_populates='product')
    price_history: Mapped[list['ProductPriceHistory']] = relationship(back_populates='product')


class Invoice(Base):
    __tablename__ = 'invoices'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    invoice_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    payment_method: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(SAEnum(InvoiceStatus), nullable=False, default=InvoiceStatus.COMPLETED)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    creator: Mapped['User'] = relationship(back_populates='invoices')
    invoice_items: Mapped[list['InvoiceItem']] = relationship(back_populates='invoice')


class InvoiceItem(Base):
    __tablename__ = 'invoice_items'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey('invoices.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    product_name_mr: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    gst_rate: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    invoice: Mapped['Invoice'] = relationship(back_populates='invoice_items')
    product: Mapped['Product'] = relationship(back_populates='invoice_items')


class StockMovement(Base):
    __tablename__ = 'stock_movements'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    type: Mapped[StockMovementType] = mapped_column(SAEnum(StockMovementType), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped['Product'] = relationship(back_populates='stock_movements')


class ProductPriceHistory(Base):
    __tablename__ = 'product_price_history'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False)
    old_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    new_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    changed_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    product: Mapped['Product'] = relationship(back_populates='price_history')
    changed_by_user: Mapped['User | None'] = relationship(back_populates='product_price_history')
