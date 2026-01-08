package com.example.Service;

import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.example.Entity.PaymentRequest;
import com.example.Repository.PaymentRequestRepository;

@Component
public class PaymentRequestExpiryScheduler {

    private final PaymentRequestRepository repository;

    public PaymentRequestExpiryScheduler(PaymentRequestRepository repository) {
        this.repository = repository;
    }

    // Run every minute to mark expired requests as EXPIRED
    @Scheduled(fixedDelay = 60_000)
    public void markExpiredRequests() {
        Instant now = Instant.now();
        List<PaymentRequest> toExpire = repository.findByStatusAndExpiresAtBefore("CREATED", now);
        if (toExpire.isEmpty()) return;
        for (PaymentRequest pr : toExpire) {
            pr.setStatus("EXPIRED");
        }
        repository.saveAll(toExpire);
    }
}
