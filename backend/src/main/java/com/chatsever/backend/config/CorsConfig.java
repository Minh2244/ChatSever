package com.chatsever.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // ĐỔI SANG allowedOriginPatterns ĐỂ KHÔNG BỊ XUNG ĐỘT VỚI Credentials
                .allowedOriginPatterns(
                        "https://chat-sever-roan.vercel.app",
                        "https://chat-sever-roan.vercel.app/", // Thêm cái có dấu gạch chéo cho chắc ăn 100%
                        "http://localhost:5173" // Mở luôn cho lúc code trên máy tính
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}