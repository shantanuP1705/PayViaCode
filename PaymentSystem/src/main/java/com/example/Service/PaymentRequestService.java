package com.example.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.Entity.PaymentRequest;
import com.example.Repository.PaymentRequestRepository;
import com.example.Repository.ProfileRepository;
import com.example.Entity.ProfileDto;

@Service
public class PaymentRequestService {

    private final PaymentRequestRepository repository;
    private final SecureRandom random = new SecureRandom();
    private final ProfileRepository profileRepository;

    @Value("${payment.code.ttl-minutes:5}")
    private int ttlMinutes;

    public PaymentRequestService(PaymentRequestRepository repository, ProfileRepository profileRepository) {
        this.repository = repository;
        this.profileRepository = profileRepository;
    }

    public PaymentRequest create(BigDecimal amount, String note, String payerEmail, ObjectId payerProfileId) {
        if (amount == null || amount.compareTo(BigDecimal.valueOf(0.01)) < 0) {
            throw new IllegalArgumentException("Invalid amount");
        }

        PaymentRequest pr = new PaymentRequest();
        pr.setAmount(amount);
        pr.setNote(note);
        if (payerEmail != null) {
            pr.setPayerEmail(payerEmail.trim().toLowerCase());
        }
        if (payerProfileId != null) {
            pr.setPayerProfileId(payerProfileId);
        } else if (pr.getPayerEmail() != null) {
            profileRepository.findFirstByEmail(pr.getPayerEmail())
                .ifPresent((ProfileDto p) -> pr.setPayerProfileId(p.getId()));
        }
        pr.setCode(generateUniqueCode());
        pr.setStatus("CREATED");
        pr.setCreatedAt(Instant.now());
        pr.setExpiresAt(Instant.now().plus(ttlMinutes, ChronoUnit.MINUTES));

        return repository.save(pr);
    }

    private String generateUniqueCode() {
        // Try a few times to avoid rare collisions
        for (int i = 0; i < 5; i++) {
            String code = randomCode(8);
            if (repository.findFirstByCode(code).isEmpty()) {
                return code;
            }
        }
        // Fallback with longer code
        String code;
        do {
            code = randomCode(10);
        } while (repository.findFirstByCode(code).isPresent());
        return code;
    }

    private String randomCode(int length) {
        final String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public java.util.Optional<PaymentRequest> findByCode(String code) {
        return repository.findFirstByCode(code).map(pr -> {
            if (pr.getExpiresAt() != null && Instant.now().isAfter(pr.getExpiresAt()) && !"EXPIRED".equals(pr.getStatus())) {
                pr.setStatus("EXPIRED");
                repository.save(pr);
            }
            return pr;
        });
    }
}
