package com.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Webhooks públicos (Meta verifica con token propio)
                .requestMatchers("/api/webhook/**").permitAll()
                // Actuator health
                .requestMatchers("/actuator/health").permitAll()
                // Todo lo demás requiere autenticación (por ahora permitimos para dev)
                .anyRequest().permitAll()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes: locales + producción (configurado vía variable de entorno CORS_ALLOWED_ORIGINS)
        // Ejemplo: CORS_ALLOWED_ORIGINS=https://mi-crm.railway.app,https://mi-crm.com
        String extraOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        ArrayList<String> origins = new ArrayList<>(List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:4173"
        ));
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            for (String o : extraOrigins.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
