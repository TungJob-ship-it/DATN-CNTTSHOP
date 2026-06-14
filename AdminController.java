package com.fpoly.controller.admin;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

@Controller
@Transactional
public class AdminController {

    @PersistenceContext
    private EntityManager em;

    @GetMapping("/admin/dashboard")
    public String dashboard() {
        return "admin/dashboard";
    }

    // ==========================================
    // API: THỐNG KÊ
    // ==========================================
    @GetMapping("/admin/api/stats")
    @ResponseBody
    public Map<String, Object> getStats() {
        Map<String, Object> result = new HashMap<>();
        try {
            result.put("todayOrders",
                em.createNativeQuery("SELECT COUNT(*) FROM [ORDER] WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)").getSingleResult());
            result.put("todayRevenue",
                em.createNativeQuery("SELECT ISNULL(SUM(total_amount),0) FROM [ORDER] WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE) AND status!='cancelled'").getSingleResult());
            result.put("newCustomers",
                em.createNativeQuery("SELECT COUNT(*) FROM [USER] WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)").getSingleResult());
            result.put("totalCustomers",
                em.createNativeQuery("SELECT COUNT(*) FROM [USER] WHERE role='customer'").getSingleResult());
            result.put("recentOrders",
                em.createNativeQuery("SELECT TOP 10 o.order_code, u.full_name, o.total_amount, o.status, CONVERT(VARCHAR,o.created_at,103) FROM [ORDER] o JOIN [USER] u ON o.user_id=u.id ORDER BY o.created_at DESC").getResultList());
            result.put("last7Days",
                em.createNativeQuery("SELECT CONVERT(VARCHAR,CAST(created_at AS DATE),103), COUNT(*) FROM [ORDER] WHERE created_at>=DATEADD(DAY,-6,CAST(GETDATE() AS DATE)) GROUP BY CAST(created_at AS DATE) ORDER BY CAST(created_at AS DATE) ASC").getResultList());
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // ==========================================
    // API: DOANH THU
    // ==========================================
    @GetMapping("/admin/api/revenue")
    @ResponseBody
    public Map<String, Object> getRevenue(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q1 = em.createNativeQuery("SELECT ISNULL(SUM(total_amount),0) FROM [ORDER] WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled'");
            q1.setParameter("from", from); q1.setParameter("to", to);
            result.put("totalRevenue", q1.getSingleResult());

            Query q2 = em.createNativeQuery("SELECT COUNT(*) FROM [ORDER] WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status='delivered'");
            q2.setParameter("from", from); q2.setParameter("to", to);
            result.put("successOrders", q2.getSingleResult());

            Query q3 = em.createNativeQuery("SELECT ISNULL(AVG(total_amount),0) FROM [ORDER] WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled'");
            q3.setParameter("from", from); q3.setParameter("to", to);
            result.put("avgOrder", q3.getSingleResult());

            Query q4 = em.createNativeQuery("SELECT COUNT(*) FROM [ORDER] WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status='refunded'");
            q4.setParameter("from", from); q4.setParameter("to", to);
            result.put("refundedOrders", q4.getSingleResult());

            Query q5 = em.createNativeQuery(
                "SELECT 'Tuần '+CAST(ROW_NUMBER() OVER(ORDER BY MIN(CAST(created_at AS DATE))) AS VARCHAR), ISNULL(SUM(total_amount),0) " +
                "FROM [ORDER] WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled' " +
                "GROUP BY DATEPART(WEEK,created_at) ORDER BY MIN(CAST(created_at AS DATE)) ASC");
            q5.setParameter("from", from); q5.setParameter("to", to);
            result.put("weeklyRevenue", q5.getResultList());

            Query q6 = em.createNativeQuery(
                "SELECT c.name, ISNULL(SUM(oi.unit_price*oi.quantity),0) " +
                "FROM ORDER_ITEM oi JOIN PRODUCT_VARIANT pv ON oi.variant_id=pv.id " +
                "JOIN PRODUCT p ON pv.product_id=p.id JOIN CATEGORY c ON p.category_id=c.id " +
                "JOIN [ORDER] o ON oi.order_id=o.id " +
                "WHERE CAST(o.created_at AS DATE) BETWEEN :from AND :to AND o.status!='cancelled' " +
                "GROUP BY c.name ORDER BY 2 DESC");
            q6.setParameter("from", from); q6.setParameter("to", to);
            result.put("categoryRevenue", q6.getResultList());
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return result;
    }

    // ==========================================
    // API: SHIPPING ZONE
    // ==========================================
    @GetMapping("/admin/api/shipping")
    @ResponseBody
    public Map<String, Object> getShippingZones() {
        Map<String, Object> result = new HashMap<>();
        try {
            // Tạo bảng nếu chưa có
            em.createNativeQuery(
                "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='SHIPPING_ZONE') " +
                "CREATE TABLE SHIPPING_ZONE (" +
                "id INT IDENTITY(1,1) PRIMARY KEY," +
                "name NVARCHAR(150) NOT NULL," +
                "zone_key VARCHAR(50) NOT NULL UNIQUE," +
                "base_fee INT NOT NULL DEFAULT 20000," +
                "kg_fee INT NOT NULL DEFAULT 5000," +
                "free_from INT NOT NULL DEFAULT 800000," +
                "is_active BIT NOT NULL DEFAULT 1)"
            ).executeUpdate();

            // Seed nếu trống
            Object countObj = em.createNativeQuery("SELECT COUNT(*) FROM SHIPPING_ZONE").getSingleResult();
            int cnt = ((Number) countObj).intValue();
            if (cnt == 0) {
                em.createNativeQuery("INSERT INTO SHIPPING_ZONE (name,zone_key,base_fee,kg_fee,free_from) VALUES (N'Hà Nội','hn',20000,5000,800000)").executeUpdate();
                em.createNativeQuery("INSERT INTO SHIPPING_ZONE (name,zone_key,base_fee,kg_fee,free_from) VALUES (N'TP.HCM','hcm',20000,5000,800000)").executeUpdate();
                em.createNativeQuery("INSERT INTO SHIPPING_ZONE (name,zone_key,base_fee,kg_fee,free_from) VALUES (N'Đà Nẵng','dn',25000,7000,1000000)").executeUpdate();
                em.createNativeQuery("INSERT INTO SHIPPING_ZONE (name,zone_key,base_fee,kg_fee,free_from) VALUES (N'Tỉnh khác','other',35000,10000,2000000)").executeUpdate();
            }

            List list = em.createNativeQuery("SELECT id,name,zone_key,base_fee,kg_fee,free_from,is_active FROM SHIPPING_ZONE ORDER BY id ASC").getResultList();
            result.put("success", true);
            result.put("data", list);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("data", java.util.Collections.emptyList());
        }
        return result;
    }

    @PostMapping("/admin/api/shipping")
    @ResponseBody
    public Map<String, Object> addShippingZone(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery("INSERT INTO SHIPPING_ZONE (name,zone_key,base_fee,kg_fee,free_from) VALUES (:name,:key,:base,:kg,:free)");
            q.setParameter("name", body.get("name").toString());
            q.setParameter("key",  body.get("key").toString());
            q.setParameter("base", toInt(body.get("base")));
            q.setParameter("kg",   toInt(body.get("kg")));
            q.setParameter("free", toInt(body.get("free")));
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    @PutMapping("/admin/api/shipping/{id}")
    @ResponseBody
    public Map<String, Object> updateShippingZone(@PathVariable int id, @RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery("UPDATE SHIPPING_ZONE SET name=:name,base_fee=:base,kg_fee=:kg,free_from=:free WHERE id=:id");
            q.setParameter("name", body.get("name").toString());
            q.setParameter("base", toInt(body.get("base")));
            q.setParameter("kg",   toInt(body.get("kg")));
            q.setParameter("free", toInt(body.get("free")));
            q.setParameter("id",   id);
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // Helper chuyển Object (Integer hoặc Double từ JSON) sang int
    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        return Integer.parseInt(val.toString().replace(".0",""));
    }

    @DeleteMapping("/admin/api/shipping/{id}")
    @ResponseBody
    public Map<String, Object> deleteShippingZone(@PathVariable int id) {
        Map<String, Object> result = new HashMap<>();
        try {
            em.createNativeQuery("DELETE FROM SHIPPING_ZONE WHERE id=:id").setParameter("id", id).executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // ==========================================
    // API: COUPON
    // ==========================================
    @GetMapping("/admin/api/coupon")
    @ResponseBody
    public Map<String, Object> getCoupons() {
        Map<String, Object> result = new HashMap<>();
        try {
            // Tạo bảng COUPON nếu chưa có
            em.createNativeQuery(
                "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='COUPON') " +
                "CREATE TABLE COUPON (" +
                "id INT IDENTITY(1,1) PRIMARY KEY," +
                "code VARCHAR(50) NOT NULL UNIQUE," +
                "discount_type VARCHAR(20) NOT NULL DEFAULT 'percent'," +
                "discount_value DECIMAL(18,2) NOT NULL," +
                "min_order_value DECIMAL(18,2) NOT NULL DEFAULT 0," +
                "max_uses INT NULL," +
                "used_count INT NOT NULL DEFAULT 0," +
                "expires_at DATE NULL," +
                "is_active BIT NOT NULL DEFAULT 1," +
                "created_at DATETIME2 NOT NULL DEFAULT GETDATE())"
            ).executeUpdate();

            List list = em.createNativeQuery(
                "SELECT id,code,discount_type,discount_value,min_order_value,max_uses,used_count,expires_at,is_active FROM COUPON ORDER BY id DESC"
            ).getResultList();
            result.put("success", true);
            result.put("data", list);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("data", java.util.Collections.emptyList());
        }
        return result;
    }

    @PostMapping("/admin/api/coupon")
    @ResponseBody
    public Map<String, Object> addCoupon(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                "INSERT INTO COUPON (code,discount_type,discount_value,min_order_value,max_uses,expires_at,is_active) " +
                "VALUES (:code,:type,:val,:min,:max,:exp,1)");
            q.setParameter("code", body.get("code").toString().toUpperCase());
            q.setParameter("type", body.get("type").toString());
            q.setParameter("val",  Double.parseDouble(body.get("value").toString()));
            q.setParameter("min",  body.get("min") != null ? Double.parseDouble(body.get("min").toString()) : 0);
            q.setParameter("max",  body.get("maxUse") != null && !body.get("maxUse").toString().isEmpty()
                                   ? Integer.parseInt(body.get("maxUse").toString()) : null);
            q.setParameter("exp",  body.get("expiry") != null && !body.get("expiry").toString().isEmpty()
                                   ? LocalDate.parse(body.get("expiry").toString()) : null);
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    @DeleteMapping("/admin/api/coupon/{id}")
    @ResponseBody
    public Map<String, Object> deleteCoupon(@PathVariable int id) {
        Map<String, Object> result = new HashMap<>();
        try {
            em.createNativeQuery("DELETE FROM COUPON WHERE id=:id").setParameter("id", id).executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }
}
