package com.example.Config;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

public class RateLimitingFilter extends OncePerRequestFilter {

    private static final long ONE_MINUTE_MILLIS = 60_000L;

    private final Map<String, SimpleRateLimiter> limiters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        RateLimitPolicy policy = resolvePolicy(request);
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = clientIp + ":" + policy.getKey();

        SimpleRateLimiter limiter = limiters.computeIfAbsent(key,
                k -> new SimpleRateLimiter(policy.getCapacity(), policy.getRefillIntervalMillis(), policy.getRefillTokens()));

        if (!limiter.tryConsume()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"too_many_requests\",\"message\":\"Rate limit exceeded. Please try again later.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return comma >= 0 ? forwarded.substring(0, comma).trim() : forwarded.trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private RateLimitPolicy resolvePolicy(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if (uri == null) {
            return null;
        }

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/payments/code/approve")) {
            return new RateLimitPolicy("PAYMENT_CODE_APPROVE", 5, ONE_MINUTE_MILLIS, 5);
        }

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/payments/code/confirm")) {
            return new RateLimitPolicy("PAYMENT_CODE_CONFIRM", 10, ONE_MINUTE_MILLIS, 10);
        }

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/payments/requests")) {
            return new RateLimitPolicy("PAYMENT_REQUEST_CREATE", 20, ONE_MINUTE_MILLIS, 20);
        }

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/wallet/")) {
            return new RateLimitPolicy("WALLET_MUTATION", 20, ONE_MINUTE_MILLIS, 20);
        }

        if (uri.startsWith("/api/profile")) {
            return new RateLimitPolicy("PROFILE_API", 20, ONE_MINUTE_MILLIS, 20);
        }

        if (uri.startsWith("/api/")) {
            return new RateLimitPolicy("GENERAL_API", 60, ONE_MINUTE_MILLIS, 60);
        }

        return null;
    }

    private static final class RateLimitPolicy {
        private final String key;
        private final int capacity;
        private final long refillIntervalMillis;
        private final int refillTokens;

        private RateLimitPolicy(String key, int capacity, long refillIntervalMillis, int refillTokens) {
            this.key = key;
            this.capacity = capacity;
            this.refillIntervalMillis = refillIntervalMillis;
            this.refillTokens = refillTokens;
        }

        public String getKey() {
            return key;
        }

        public int getCapacity() {
            return capacity;
        }

        public long getRefillIntervalMillis() {
            return refillIntervalMillis;
        }

        public int getRefillTokens() {
            return refillTokens;
        }
    }

    private static final class SimpleRateLimiter {
        private final int capacity;
        private final long refillIntervalMillis;
        private final int refillTokens;

        private long lastRefillTimestamp;
        private int availableTokens;

        private SimpleRateLimiter(int capacity, long refillIntervalMillis, int refillTokens) {
            this.capacity = capacity;
            this.refillIntervalMillis = refillIntervalMillis;
            this.refillTokens = refillTokens;
            this.availableTokens = capacity;
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            refillIfNeeded();
            if (availableTokens > 0) {
                availableTokens--;
                return true;
            }
            return false;
        }

        private void refillIfNeeded() {
            long now = System.currentTimeMillis();
            if (now <= lastRefillTimestamp) {
                return;
            }

            long elapsed = now - lastRefillTimestamp;
            long intervals = elapsed / refillIntervalMillis;
            if (intervals <= 0) {
                return;
            }

            long tokensToAdd = intervals * (long) refillTokens;
            if (tokensToAdd > 0) {
                long newTokens = (long) availableTokens + tokensToAdd;
                availableTokens = (int) Math.min(capacity, newTokens);
                lastRefillTimestamp += intervals * refillIntervalMillis;
            }
        }
    }
}
