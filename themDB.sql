use ShopDB
INSERT INTO [USER]
(
    full_name,
    email,
    phone,
    password_hash,
    role,
    is_active,
    created_at
)
VALUES
(
    N'Nhân viên',
    'staff@gmail.com',
    '0900000001',
    '$2a$10$7hHq0vW4Lh2T8U2W1X8wBe1wTQm2h3K3Q3A8vY0D0H4s9kL0xP2Ca',
    'staff',
    1,
    GETDATE()
)