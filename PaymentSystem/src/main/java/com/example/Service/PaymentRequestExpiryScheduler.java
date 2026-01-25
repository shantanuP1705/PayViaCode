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
    private final com.example.Service.WalletTransactionService txService;

    public PaymentRequestExpiryScheduler(PaymentRequestRepository repository, com.example.Service.WalletTransactionService txService) {
        this.repository = repository;
        this.txService = txService;
    }

    // Run every minute to mark expired requests: CREATED -> EXPIRED, RECEIVER_CONFIRMED -> FAILED
    @Scheduled(fixedDelay = 60_000)
    public void markExpiredRequests() {
        Instant now = Instant.now();
        List<PaymentRequest> created = repository.findByStatusAndExpiresAtBefore("CREATED", now);
        for (PaymentRequest pr : created) { pr.setStatus("EXPIRED"); }
        if (!created.isEmpty()) repository.saveAll(created);

        List<PaymentRequest> receiverConfirmed = repository.findByStatusAndExpiresAtBefore("RECEIVER_CONFIRMED", now);
        for (PaymentRequest pr : receiverConfirmed) {
            pr.setStatus("FAILED");
            try {
                // record failed event for both parties
                java.math.BigDecimal amt = pr.getAmount();
                if (pr.getPayerEmail() != null) {
                    txService.recordEvent(pr.getPayerEmail(), amt, "PAYMENT_FAILED", "Expired without approval - Code " + pr.getCode(), pr.getReceiverEmail(), "Failed");
                }
                if (pr.getReceiverEmail() != null) {
                    txService.recordEvent(pr.getReceiverEmail(), amt, "PAYMENT_FAILED", "Expired without approval - Code " + pr.getCode(), pr.getPayerEmail(), "Failed");
                }
            } catch (Exception ignore) {}
        }
        if (!receiverConfirmed.isEmpty()) repository.saveAll(receiverConfirmed);
    }
}
