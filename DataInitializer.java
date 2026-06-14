package com.fpoly.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import com.fpoly.model.NguoiDung;
import com.fpoly.model.enums.VaiTro;
import com.fpoly.repository.NguoiDungRepository;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner init(
            NguoiDungRepository repo,
            PasswordEncoder encoder
    ) {

        return args -> {

            if (repo.findByEmail("admin@gmail.com").isEmpty()) {

                NguoiDung admin = new NguoiDung();

                admin.setHoTen("Administrator");

                admin.setEmail("admin@gmail.com");

                admin.setSoDienThoai("0900000000");

                admin.setMatKhau(
                        encoder.encode("123")
                );

                admin.setVaiTro(VaiTro.admin);

                admin.setIsActive(true);
                admin.setCreatedAt(LocalDateTime.now());
                repo.save(admin);

                System.out.println("Đã tạo admin");
            }
        };
    }
}