-- ============================================================
--  DATABASE SCHEMA - HỆ THỐNG BÁN HÀNG
--  SQL Server (T-SQL)
-- ============================================================

USE master;
GO

-- Xóa database cũ nếu tồn tại
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'ShopDB')
BEGIN
    ALTER DATABASE ShopDB
    SET SINGLE_USER
    WITH ROLLBACK IMMEDIATE;

    DROP DATABASE ShopDB;
END
GO

-- Tạo database mới
CREATE DATABASE ShopDB
COLLATE Vietnamese_CI_AS;
GO

USE ShopDB;
GO

-- ============================================================
--  1. USER & AUTH
-- ============================================================

CREATE TABLE [USER] (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(150) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash NVARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer','admin','staff')),

    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE USER_ADDRESS (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL
        REFERENCES [USER](id) ON DELETE CASCADE,

    receiver_name NVARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    address NVARCHAR(500) NOT NULL,
    province NVARCHAR(100) NOT NULL,
    district NVARCHAR(100) NOT NULL,
    ward NVARCHAR(100) NOT NULL,

    is_default BIT NOT NULL DEFAULT 0
);
GO

-- ============================================================
--  2. CATALOG
-- ============================================================

CREATE TABLE CATEGORY (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name NVARCHAR(150) NOT NULL,
    slug NVARCHAR(200) NOT NULL UNIQUE,

    parent_id INT NULL
        REFERENCES CATEGORY(id),

    image_url NVARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0
);
GO

CREATE TABLE BRAND (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name NVARCHAR(100) NOT NULL UNIQUE,
    logo_url NVARCHAR(500)
);
GO

CREATE TABLE TAG (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name NVARCHAR(100) NOT NULL UNIQUE,
    slug NVARCHAR(150) NOT NULL UNIQUE
);
GO

-- ============================================================
--  3. PRODUCT
-- ============================================================

CREATE TABLE PRODUCT (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name NVARCHAR(300) NOT NULL,
    slug NVARCHAR(350) NOT NULL UNIQUE,

    description NVARCHAR(MAX),

    category_id INT NOT NULL
        REFERENCES CATEGORY(id),

    brand_id INT NULL
        REFERENCES BRAND(id),

    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE PRODUCT_TAG (
    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    tag_id INT NOT NULL
        REFERENCES TAG(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, tag_id)
);
GO

CREATE TABLE PRODUCT_IMAGE (
    id INT IDENTITY(1,1) PRIMARY KEY,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    variant_id INT NULL,

    url NVARCHAR(500) NOT NULL,

    is_primary BIT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0
);
GO

CREATE TABLE PRODUCT_SPEC (
    id INT IDENTITY(1,1) PRIMARY KEY,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    spec_key NVARCHAR(150) NOT NULL,
    spec_value NVARCHAR(500) NOT NULL,

    sort_order INT NOT NULL DEFAULT 0
);
GO

-- ============================================================
--  4. VARIANT & OPTIONS
-- ============================================================

CREATE TABLE PRODUCT_OPTION (
    id INT IDENTITY(1,1) PRIMARY KEY,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    option_name NVARCHAR(100) NOT NULL
);
GO

CREATE TABLE OPTION_VALUE (
    id INT IDENTITY(1,1) PRIMARY KEY,

    option_id INT NOT NULL
        REFERENCES PRODUCT_OPTION(id) ON DELETE CASCADE,

    value NVARCHAR(100) NOT NULL
);
GO

CREATE TABLE PRODUCT_VARIANT (
    id INT IDENTITY(1,1) PRIMARY KEY,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    sku VARCHAR(100) NOT NULL UNIQUE,

    price DECIMAL(18,2) NOT NULL,
    original_price DECIMAL(18,2),

    stock INT NOT NULL DEFAULT 0,
    is_default BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE VARIANT_OPTION_VALUE (
    variant_id INT NOT NULL
        REFERENCES PRODUCT_VARIANT(id) ON DELETE CASCADE,

    option_value_id INT NOT NULL
        REFERENCES OPTION_VALUE(id),

    PRIMARY KEY (variant_id, option_value_id)
);
GO

-- FK PRODUCT_IMAGE -> PRODUCT_VARIANT
-- KHÔNG dùng ON DELETE SET NULL để tránh multiple cascade paths
ALTER TABLE PRODUCT_IMAGE
ADD CONSTRAINT FK_ProductImage_Variant
FOREIGN KEY (variant_id)
REFERENCES PRODUCT_VARIANT(id);
GO

-- ============================================================
--  5. RELATED & BUNDLE
-- ============================================================

CREATE TABLE PRODUCT_RELATED (
    product_id INT NOT NULL
        REFERENCES PRODUCT(id),

    related_product_id INT NOT NULL
        REFERENCES PRODUCT(id),

    relation_type VARCHAR(30) NOT NULL DEFAULT 'suggestion'
        CHECK (relation_type IN ('suggestion','accessory','similar')),

    PRIMARY KEY (product_id, related_product_id),

    CHECK (product_id <> related_product_id)
);
GO

CREATE TABLE BUNDLE (
    id INT IDENTITY(1,1) PRIMARY KEY,

    main_product_id INT NOT NULL
        REFERENCES PRODUCT(id),

    bundle_product_id INT NOT NULL
        REFERENCES PRODUCT(id),

    discount_price DECIMAL(18,2),

    CHECK (main_product_id <> bundle_product_id)
);
GO

-- ============================================================
--  6. COUPON
-- ============================================================

CREATE TABLE COUPON (
    id INT IDENTITY(1,1) PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,

    discount_type VARCHAR(20) NOT NULL DEFAULT 'percent'
        CHECK (discount_type IN ('percent','fixed')),

    discount_value DECIMAL(18,2) NOT NULL,

    min_order_value DECIMAL(18,2) NOT NULL DEFAULT 0,

    max_uses INT,
    used_count INT NOT NULL DEFAULT 0,

    starts_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    expires_at DATETIME2,

    is_active BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE COUPON_PRODUCT (
    coupon_id INT NOT NULL
        REFERENCES COUPON(id) ON DELETE CASCADE,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    PRIMARY KEY (coupon_id, product_id)
);
GO

-- ============================================================
--  7. CART
-- ============================================================

CREATE TABLE CART (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL
        REFERENCES [USER](id) ON DELETE CASCADE,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_Cart_User UNIQUE (user_id)
);
GO

CREATE TABLE CART_ITEM (
    id INT IDENTITY(1,1) PRIMARY KEY,

    cart_id INT NOT NULL
        REFERENCES CART(id) ON DELETE CASCADE,

    variant_id INT NOT NULL
        REFERENCES PRODUCT_VARIANT(id),

    quantity INT NOT NULL DEFAULT 1
        CHECK (quantity > 0),

    CONSTRAINT UQ_CartItem UNIQUE (cart_id, variant_id)
);
GO

-- ============================================================
--  8. ORDER
-- ============================================================

CREATE TABLE [ORDER] (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL
        REFERENCES [USER](id),

    address_id INT NOT NULL
        REFERENCES USER_ADDRESS(id),

    coupon_id INT NULL
        REFERENCES COUPON(id),

    order_code VARCHAR(30) NOT NULL UNIQUE,

    subtotal DECIMAL(18,2) NOT NULL,

    discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0,

    shipping_fee DECIMAL(18,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(18,2) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'refunded'
        )),

    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE ORDER_ITEM (
    id INT IDENTITY(1,1) PRIMARY KEY,

    order_id INT NOT NULL
        REFERENCES [ORDER](id) ON DELETE CASCADE,

    variant_id INT NOT NULL
        REFERENCES PRODUCT_VARIANT(id),

    product_name NVARCHAR(300) NOT NULL,
    variant_info NVARCHAR(300),

    unit_price DECIMAL(18,2) NOT NULL,

    quantity INT NOT NULL
        CHECK (quantity > 0)
);
GO

CREATE TABLE ORDER_STATUS_LOG (
    id INT IDENTITY(1,1) PRIMARY KEY,

    order_id INT NOT NULL
        REFERENCES [ORDER](id) ON DELETE CASCADE,

    status VARCHAR(30) NOT NULL,

    note NVARCHAR(500),

    changed_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
--  9. PAYMENT
-- ============================================================

CREATE TABLE PAYMENT_METHOD (
    id INT IDENTITY(1,1) PRIMARY KEY,

    name NVARCHAR(100) NOT NULL,

    code VARCHAR(50) NOT NULL UNIQUE,

    logo_url NVARCHAR(500),

    is_active BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE PAYMENT (
    id INT IDENTITY(1,1) PRIMARY KEY,

    order_id INT NOT NULL
        REFERENCES [ORDER](id) ON DELETE CASCADE,

    payment_method_id INT NOT NULL
        REFERENCES PAYMENT_METHOD(id),

    amount DECIMAL(18,2) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','failed','refunded')),

    transaction_ref VARCHAR(200),

    paid_at DATETIME2
);
GO

-- ============================================================
--  10. REVIEW
-- ============================================================

CREATE TABLE REVIEW (
    id INT IDENTITY(1,1) PRIMARY KEY,

    product_id INT NOT NULL
        REFERENCES PRODUCT(id) ON DELETE CASCADE,

    user_id INT NOT NULL
        REFERENCES [USER](id),

    order_id INT NULL
        REFERENCES [ORDER](id),

    rating TINYINT NOT NULL
        CHECK (rating BETWEEN 1 AND 5),

    comment NVARCHAR(2000),

    is_verified BIT NOT NULL DEFAULT 0,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT UQ_Review UNIQUE (product_id, user_id, order_id)
);
GO

-- ============================================================
--  11. PC BUILD
-- ============================================================

CREATE TABLE PC_BUILD (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL
        REFERENCES [USER](id) ON DELETE CASCADE,

    name NVARCHAR(200) NOT NULL,

    note NVARCHAR(MAX),

    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE PC_BUILD_ITEM (
    id INT IDENTITY(1,1) PRIMARY KEY,

    build_id INT NOT NULL
        REFERENCES PC_BUILD(id) ON DELETE CASCADE,

    variant_id INT NOT NULL
        REFERENCES PRODUCT_VARIANT(id),

    component_type NVARCHAR(100) NOT NULL,

    quantity INT NOT NULL DEFAULT 1
        CHECK (quantity > 0)
);
GO

-- ============================================================
--  12. WARRANTY
-- ============================================================

CREATE TABLE WARRANTY (
    id INT IDENTITY(1,1) PRIMARY KEY,

    order_item_id INT NOT NULL
        REFERENCES ORDER_ITEM(id),

    user_id INT NOT NULL
        REFERENCES [USER](id),

    serial_number VARCHAR(100),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','expired','void')),

    CHECK (end_date > start_date)
);
GO

CREATE TABLE WARRANTY_REQUEST (
    id INT IDENTITY(1,1) PRIMARY KEY,

    warranty_id INT NOT NULL
        REFERENCES WARRANTY(id) ON DELETE CASCADE,

    issue_description NVARCHAR(2000) NOT NULL,

    request_status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (request_status IN (
            'pending',
            'processing',
            'resolved',
            'rejected'
        )),

    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
--  INDEXES
-- ============================================================

CREATE INDEX IX_Product_Category ON PRODUCT(category_id);
CREATE INDEX IX_Product_Brand ON PRODUCT(brand_id);
CREATE INDEX IX_Product_Slug ON PRODUCT(slug);
CREATE INDEX IX_Product_Active ON PRODUCT(is_active);

CREATE INDEX IX_Variant_Product ON PRODUCT_VARIANT(product_id);
CREATE INDEX IX_Variant_SKU ON PRODUCT_VARIANT(sku);

CREATE INDEX IX_Order_User ON [ORDER](user_id);
CREATE INDEX IX_Order_Status ON [ORDER](status);
CREATE INDEX IX_Order_Code ON [ORDER](order_code);
CREATE INDEX IX_Order_Created ON [ORDER](created_at DESC);

CREATE INDEX IX_CartItem_Cart ON CART_ITEM(cart_id);

CREATE INDEX IX_Review_Product ON REVIEW(product_id);

CREATE INDEX IX_Warranty_User ON WARRANTY(user_id);
CREATE INDEX IX_Warranty_Serial ON WARRANTY(serial_number);

CREATE INDEX IX_User_Email ON [USER](email);
GO

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO PAYMENT_METHOD (name, code, is_active)
VALUES
(N'Thanh toán khi nhận hàng', 'cod', 1),
(N'VNPay', 'vnpay', 1),
(N'MoMo', 'momo', 1),
(N'Chuyển khoản ngân hàng', 'banking', 1);
GO

INSERT INTO CATEGORY (name, slug, parent_id, sort_order)
VALUES
(N'Laptop', 'laptop', NULL, 1),
(N'PC & Máy tính bàn', 'pc-may-tinh-ban', NULL, 2),
(N'Linh kiện máy tính', 'linh-kien', NULL, 3),
(N'Màn hình', 'man-hinh', NULL, 4),
(N'Thiết bị ngoại vi', 'ngoai-vi', NULL, 5),
(N'Điện thoại', 'dien-thoai', NULL, 6),
(N'Tablet', 'tablet', NULL, 7),
(N'Phụ kiện', 'phu-kien', NULL, 8);
GO

INSERT INTO BRAND (name)
VALUES
(N'ASUS'),
(N'MSI'),
(N'Gigabyte'),
(N'ACER'),
(N'Dell'),
(N'HP'),
(N'Lenovo'),
(N'Apple'),
(N'Samsung'),
(N'Intel'),
(N'AMD'),
(N'NVIDIA');
GO

INSERT INTO [USER]
(full_name, email, phone, password_hash, role)
VALUES
(
    N'Quản Trị Viên',
    'admin@shopdb.vn',
    '0900000000',
    '$2b$12$placeholder_bcrypt_hash_here',
    'admin'
);
GO

INSERT INTO COUPON
(code, discount_type, discount_value, min_order_value)
VALUES
('WELCOME10', 'percent', 10, 500000),
('SALE200K', 'fixed', 200000, 2000000),
('FREESHIP', 'fixed', 30000, 300000);
GO

PRINT N'✅ Database ShopDB đã tạo thành công!';
GO

-- ============================================================
--  TEST SELECT
-- ============================================================

SELECT * FROM [USER];
SELECT * FROM USER_ADDRESS;

SELECT * FROM CATEGORY;
SELECT * FROM BRAND;
SELECT * FROM TAG;

SELECT * FROM PRODUCT;
SELECT * FROM PRODUCT_TAG;
SELECT * FROM PRODUCT_IMAGE;
SELECT * FROM PRODUCT_SPEC;

SELECT * FROM PRODUCT_OPTION;
SELECT * FROM OPTION_VALUE;
SELECT * FROM PRODUCT_VARIANT;
SELECT * FROM VARIANT_OPTION_VALUE;

SELECT * FROM PRODUCT_RELATED;
SELECT * FROM BUNDLE;

SELECT * FROM COUPON;
SELECT * FROM COUPON_PRODUCT;

SELECT * FROM CART;
SELECT * FROM CART_ITEM;

SELECT * FROM [ORDER];
SELECT * FROM ORDER_ITEM;
SELECT * FROM ORDER_STATUS_LOG;

SELECT * FROM PAYMENT_METHOD;
SELECT * FROM PAYMENT;

SELECT * FROM REVIEW;

SELECT * FROM PC_BUILD;
SELECT * FROM PC_BUILD_ITEM;

SELECT * FROM WARRANTY;
SELECT * FROM WARRANTY_REQUEST;