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

    // ==========================================
    // TRANG DASHBOARD
    // ==========================================
    @GetMapping("/admin/dashboard")
    public String dashboard() {
        return "admin/dashboard";
    }

    // ==========================================
    // API: THỐNG KÊ TỔNG QUAN
    // ==========================================
    @GetMapping("/admin/api/stats")
    @ResponseBody
    public Map<String, Object> getStats() {
        Map<String, Object> result = new HashMap<>();

        result.put("todayOrders",
            em.createNativeQuery(
                "SELECT COUNT(*) FROM [ORDER] WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)"
            ).getSingleResult());

        result.put("todayRevenue",
            em.createNativeQuery(
                "SELECT ISNULL(SUM(total_amount),0) FROM [ORDER] " +
                "WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE) AND status!='cancelled'"
            ).getSingleResult());

        result.put("newCustomers",
            em.createNativeQuery(
                "SELECT COUNT(*) FROM [USER] WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)"
            ).getSingleResult());

        result.put("totalCustomers",
            em.createNativeQuery(
                "SELECT COUNT(*) FROM [USER] WHERE role='customer'"
            ).getSingleResult());

        result.put("recentOrders",
            em.createNativeQuery(
                "SELECT TOP 10 o.order_code, u.full_name, o.total_amount, o.status, " +
                "CONVERT(VARCHAR,o.created_at,103) " +
                "FROM [ORDER] o JOIN [USER] u ON o.user_id=u.id " +
                "ORDER BY o.created_at DESC"
            ).getResultList());

        result.put("last7Days",
            em.createNativeQuery(
                "SELECT CONVERT(VARCHAR,CAST(created_at AS DATE),103), COUNT(*) " +
                "FROM [ORDER] " +
                "WHERE created_at>=DATEADD(DAY,-6,CAST(GETDATE() AS DATE)) " +
                "GROUP BY CAST(created_at AS DATE) ORDER BY CAST(created_at AS DATE) ASC"
            ).getResultList());

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

        Query q1 = em.createNativeQuery(
            "SELECT ISNULL(SUM(total_amount),0) FROM [ORDER] " +
            "WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled'");
        q1.setParameter("from", from); q1.setParameter("to", to);
        result.put("totalRevenue", q1.getSingleResult());

        Query q2 = em.createNativeQuery(
            "SELECT COUNT(*) FROM [ORDER] " +
            "WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status='delivered'");
        q2.setParameter("from", from); q2.setParameter("to", to);
        result.put("successOrders", q2.getSingleResult());

        Query q3 = em.createNativeQuery(
            "SELECT ISNULL(AVG(total_amount),0) FROM [ORDER] " +
            "WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled'");
        q3.setParameter("from", from); q3.setParameter("to", to);
        result.put("avgOrder", q3.getSingleResult());

        Query q4 = em.createNativeQuery(
            "SELECT COUNT(*) FROM [ORDER] " +
            "WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status='refunded'");
        q4.setParameter("from", from); q4.setParameter("to", to);
        result.put("refundedOrders", q4.getSingleResult());

        Query q5 = em.createNativeQuery(
            "SELECT 'Tuần '+CAST(ROW_NUMBER() OVER(ORDER BY MIN(CAST(created_at AS DATE))) AS VARCHAR), " +
            "ISNULL(SUM(total_amount),0) " +
            "FROM [ORDER] " +
            "WHERE CAST(created_at AS DATE) BETWEEN :from AND :to AND status!='cancelled' " +
            "GROUP BY DATEPART(WEEK,created_at) ORDER BY MIN(CAST(created_at AS DATE)) ASC");
        q5.setParameter("from", from); q5.setParameter("to", to);
        result.put("weeklyRevenue", q5.getResultList());

        Query q6 = em.createNativeQuery(
            "SELECT c.name, ISNULL(SUM(oi.unit_price*oi.quantity),0) " +
            "FROM ORDER_ITEM oi " +
            "JOIN PRODUCT_VARIANT pv ON oi.variant_id=pv.id " +
            "JOIN PRODUCT p ON pv.product_id=p.id " +
            "JOIN CATEGORY c ON p.category_id=c.id " +
            "JOIN [ORDER] o ON oi.order_id=o.id " +
            "WHERE CAST(o.created_at AS DATE) BETWEEN :from AND :to AND o.status!='cancelled' " +
            "GROUP BY c.name ORDER BY 2 DESC");
        q6.setParameter("from", from); q6.setParameter("to", to);
        result.put("categoryRevenue", q6.getResultList());

        return result;
    }

    // ==========================================
    // API: SHIPPING ZONE — Lấy danh sách
    // ==========================================
    @GetMapping("/admin/api/shipping")
    @ResponseBody
    public List getShippingZones() {
        return em.createNativeQuery(
            "SELECT id, name, zone_key, base_fee, kg_fee, free_from, is_active " +
            "FROM SHIPPING_ZONE ORDER BY id ASC"
        ).getResultList();
    }

    // API: SHIPPING ZONE — Thêm mới
    @PostMapping("/admin/api/shipping")
    @ResponseBody
    public Map<String, Object> addShippingZone(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                "INSERT INTO SHIPPING_ZONE (name, zone_key, base_fee, kg_fee, free_from) " +
                "VALUES (:name, :key, :base, :kg, :free)");
            q.setParameter("name", body.get("name").toString());
            q.setParameter("key",  body.get("key").toString());
            q.setParameter("base", Integer.parseInt(body.get("base").toString()));
            q.setParameter("kg",   Integer.parseInt(body.get("kg").toString()));
            q.setParameter("free", Integer.parseInt(body.get("free").toString()));
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // API: SHIPPING ZONE — Sửa
    @PutMapping("/admin/api/shipping/{id}")
    @ResponseBody
    public Map<String, Object> updateShippingZone(
            @PathVariable int id,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                "UPDATE SHIPPING_ZONE SET name=:name, base_fee=:base, kg_fee=:kg, free_from=:free " +
                "WHERE id=:id");
            q.setParameter("name", body.get("name").toString());
            q.setParameter("base", Integer.parseInt(body.get("base").toString()));
            q.setParameter("kg",   Integer.parseInt(body.get("kg").toString()));
            q.setParameter("free", Integer.parseInt(body.get("free").toString()));
            q.setParameter("id",   id);
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // API: SHIPPING ZONE — Xóa
    @DeleteMapping("/admin/api/shipping/{id}")
    @ResponseBody
    public Map<String, Object> deleteShippingZone(@PathVariable int id) {
        Map<String, Object> result = new HashMap<>();
        try {
            em.createNativeQuery("DELETE FROM SHIPPING_ZONE WHERE id=:id")
              .setParameter("id", id)
              .executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // ==========================================
    // API: COUPON — Lấy danh sách
    // ==========================================
    @GetMapping("/admin/api/coupon")
    @ResponseBody
    public List getCoupons() {
        return em.createNativeQuery(
            "SELECT id, code, discount_type, discount_value, min_order_value, " +
            "max_uses, used_count, expires_at, is_active, " +
            "condition_all_product, condition_new_product, " +
            "condition_new_customer, condition_no_sale " +
            "FROM COUPON ORDER BY id DESC"
        ).getResultList();
    }

    // API: COUPON — Thêm mới
    @PostMapping("/admin/api/coupon")
    @ResponseBody
    public Map<String, Object> addCoupon(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Query q = em.createNativeQuery(
                "INSERT INTO COUPON (code, discount_type, discount_value, min_order_value, " +
                "max_uses, expires_at, is_active, " +
                "condition_all_product, condition_new_product, condition_new_customer, condition_no_sale) " +
                "VALUES (:code, :type, :val, :min, :max, :exp, 1, :ca, :cn, :cc, :cs)");
            q.setParameter("code", body.get("code").toString().toUpperCase());
            q.setParameter("type", body.get("type").toString());
            q.setParameter("val",  Double.parseDouble(body.get("value").toString()));
            q.setParameter("min",  Double.parseDouble(body.get("min").toString()));
            q.setParameter("max",  body.get("maxUse") != null && !body.get("maxUse").toString().isEmpty()
                                   ? Integer.parseInt(body.get("maxUse").toString()) : null);
            q.setParameter("exp",  body.get("expiry") != null && !body.get("expiry").toString().isEmpty()
                                   ? LocalDate.parse(body.get("expiry").toString()) : null);
            q.setParameter("ca",   body.getOrDefault("condAll",    true));
            q.setParameter("cn",   body.getOrDefault("condNew",    false));
            q.setParameter("cc",   body.getOrDefault("condCust",   false));
            q.setParameter("cs",   body.getOrDefault("condNoSale", false));
            q.executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // API: COUPON — Xóa
    @DeleteMapping("/admin/api/coupon/{id}")
    @ResponseBody
    public Map<String, Object> deleteCoupon(@PathVariable int id) {
        Map<String, Object> result = new HashMap<>();
        try {
            em.createNativeQuery("DELETE FROM COUPON WHERE id=:id")
              .setParameter("id", id)
              .executeUpdate();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }
}