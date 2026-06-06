USE ShopDB;
GO

-- ============================================================
-- 1. BẢNG SHIPPING_ZONE (vùng giao hàng)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SHIPPING_ZONE')
BEGIN
    CREATE TABLE SHIPPING_ZONE (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        name       NVARCHAR(150) NOT NULL,
        zone_key   VARCHAR(50)   NOT NULL UNIQUE,
        base_fee   INT           NOT NULL DEFAULT 20000,
        kg_fee     INT           NOT NULL DEFAULT 5000,
        free_from  INT           NOT NULL DEFAULT 800000,
        is_active  BIT           NOT NULL DEFAULT 1,
        created_at DATETIME2     NOT NULL DEFAULT GETDATE()
    );

    INSERT INTO SHIPPING_ZONE (name, zone_key, base_fee, kg_fee, free_from) VALUES
    (N'Hà Nội',    'hn',    20000, 5000,  800000),
    (N'TP.HCM',    'hcm',   20000, 5000,  800000),
    (N'Đà Nẵng',   'dn',    25000, 7000,  1000000),
    (N'Tỉnh khác', 'other', 35000, 10000, 2000000);

    PRINT N'✅ Đã tạo bảng SHIPPING_ZONE';
END
ELSE
    PRINT N'⚠ Bảng SHIPPING_ZONE đã tồn tại, bỏ qua';
GO

-- ============================================================
-- 2. BẢNG COUPON (mã khuyến mãi)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'COUPON')
BEGIN
    CREATE TABLE COUPON (
        id                   INT IDENTITY(1,1) PRIMARY KEY,
        code                 VARCHAR(50)    NOT NULL UNIQUE,
        discount_type        VARCHAR(20)    NOT NULL DEFAULT 'percent'
                             CHECK (discount_type IN ('percent','fixed')),
        discount_value       DECIMAL(18,2)  NOT NULL,
        min_order_value      DECIMAL(18,2)  NOT NULL DEFAULT 0,
        max_uses             INT            NULL,
        used_count           INT            NOT NULL DEFAULT 0,
        starts_at            DATETIME2      NOT NULL DEFAULT GETDATE(),
        expires_at           DATETIME2      NULL,
        is_active            BIT            NOT NULL DEFAULT 1,
        condition_all_product  BIT          NOT NULL DEFAULT 1,
        condition_new_product  BIT          NOT NULL DEFAULT 0,
        condition_new_customer BIT          NOT NULL DEFAULT 0,
        condition_no_sale      BIT          NOT NULL DEFAULT 0,
        created_at           DATETIME2      NOT NULL DEFAULT GETDATE()
    );

    -- Seed dữ liệu mẫu
    INSERT INTO COUPON (code, discount_type, discount_value, min_order_value, max_uses, expires_at) VALUES
    ('WELCOME10', 'percent', 10,     500000,  100, '2025-12-31'),
    ('SALE200K',  'fixed',   200000, 2000000, 200, '2025-06-30'),
    ('FREESHIP',  'fixed',   30000,  300000,  300, '2025-06-15');

    PRINT N'✅ Đã tạo bảng COUPON';
END
ELSE
BEGIN
    -- Bảng đã tồn tại nhưng có thể thiếu cột điều kiện — thêm nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='COUPON' AND COLUMN_NAME='condition_all_product')
    BEGIN
        ALTER TABLE COUPON ADD condition_all_product  BIT NOT NULL DEFAULT 1;
        ALTER TABLE COUPON ADD condition_new_product  BIT NOT NULL DEFAULT 0;
        ALTER TABLE COUPON ADD condition_new_customer BIT NOT NULL DEFAULT 0;
        ALTER TABLE COUPON ADD condition_no_sale      BIT NOT NULL DEFAULT 0;
        PRINT N'✅ Đã thêm cột điều kiện vào bảng COUPON';
    END
    ELSE
        PRINT N'⚠ Bảng COUPON đã tồn tại đầy đủ, bỏ qua';
END
GO

PRINT N'';
PRINT N'✅ Hoàn tất — kiểm tra lại bằng:';
PRINT N'SELECT * FROM SHIPPING_ZONE';
PRINT N'SELECT * FROM COUPON';
GO

SELECT * FROM SHIPPING_ZONE;
SELECT * FROM COUPON;
GO
