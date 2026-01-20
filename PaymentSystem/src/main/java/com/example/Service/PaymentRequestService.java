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

    /**
     * Confirm a payment request by code: validates expiry and state, then locks by setting CODE_CONFIRMED.
     * Returns the updated PaymentRequest or throws IllegalStateException/IllegalArgumentException for invalid states.
     */
    public PaymentRequest confirmCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        String code = rawCode.trim().toUpperCase();
        PaymentRequest pr = repository.findFirstByCode(code).orElseThrow(() -> new IllegalArgumentException("Code not found"));

        Instant now = Instant.now();
        if (pr.getExpiresAt() != null && now.isAfter(pr.getExpiresAt())) {
            // Mark expired and reject
            if (!"EXPIRED".equals(pr.getStatus())) {
                pr.setStatus("EXPIRED");
                repository.save(pr);
            }
            throw new IllegalStateException("Code expired");
        }

        if (!"CREATED".equals(pr.getStatus())) {
            throw new IllegalStateException("Code not available");
        }

        // Lock the record to prevent reuse
        pr.setStatus("CODE_CONFIRMED");
        pr.setConfirmedAt(now);
        return repository.save(pr);
    }

    /**
     * Confirm a payment request by code with MPIN verification. The MPIN must match
     * the payer's profile associated to this request (by profileId or payerEmail).
     */
    public PaymentRequest confirmCodeWithMpin(String rawCode, String rawMpin) {
        if (rawMpin == null || rawMpin.isBlank()) {
            throw new IllegalStateException("MPIN required");
        }
        if (!rawMpin.matches("^\\d{4,6}$")) {
            throw new IllegalStateException("Invalid MPIN format");
        }

        PaymentRequest pr = confirmCodePrechecks(rawCode);

        // Find payer profile
        com.example.Entity.ProfileDto profile = null;
        if (pr.getPayerProfileId() != null) {
            profile = profileRepository.findById(pr.getPayerProfileId()).orElse(null);
        }
        if (profile == null && pr.getPayerEmail() != null) {
            profile = profileRepository.findFirstByEmail(pr.getPayerEmail()).orElse(null);
        }
        if (profile == null || profile.getMpinHash() == null || profile.getMpinHash().isBlank()) {
            throw new IllegalStateException("MPIN not set for payer");
        }

        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        boolean ok = encoder.matches(rawMpin, profile.getMpinHash());
        if (!ok) {
            throw new IllegalStateException("MPIN mismatch");
        }

        // Passed MPIN check — lock the record
        Instant now = Instant.now();
        pr.setStatus("CODE_CONFIRMED");
        pr.setConfirmedAt(now);
        return repository.save(pr);
    }

    /**
     * New flow: Receiver confirms the code first (no MPIN). Captures receiver identity
     * and moves status from CREATED -> RECEIVER_CONFIRMED. Prevents multiple receivers
     * from confirming the same code.
     */
    public PaymentRequest confirmCodeByReceiver(String rawCode, String receiverEmail, org.bson.types.ObjectId receiverProfileId) {
        PaymentRequest pr = confirmCodePrechecks(rawCode);

        // Only CREATED codes can be claimed by a receiver
        // If already claimed by another receiver, block
        if (!"CREATED".equals(pr.getStatus())) {
            throw new IllegalStateException("Code not available");
        }

        if (receiverEmail != null) {
            pr.setReceiverEmail(receiverEmail.trim().toLowerCase());
        }
        if (receiverProfileId != null) {
            pr.setReceiverProfileId(receiverProfileId);
        }
        pr.setReceiverConfirmedAt(Instant.now());
        pr.setStatus("RECEIVER_CONFIRMED");
        return repository.save(pr);
    }

    /**
     * Payer approves after receiver confirmation using MPIN, finalising the request.
     * Allowed only when status is RECEIVER_CONFIRMED.
     */
    public PaymentRequest approveConfirmedCodeWithMpin(String rawCode, String rawMpin) {
        if (rawMpin == null || rawMpin.isBlank()) {
            throw new IllegalStateException("MPIN required");
        }
        if (!rawMpin.matches("^\\d{4,6}$")) {
            throw new IllegalStateException("Invalid MPIN format");
        }

        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        String code = rawCode.trim().toUpperCase();
        PaymentRequest pr = repository.findFirstByCode(code).orElseThrow(() -> new IllegalArgumentException("Code not found"));

        Instant now = Instant.now();
        if (pr.getExpiresAt() != null && now.isAfter(pr.getExpiresAt())) {
            if (!"EXPIRED".equals(pr.getStatus())) {
                pr.setStatus("EXPIRED");
                repository.save(pr);
            }
            throw new IllegalStateException("Code expired");
        }
        if (!"RECEIVER_CONFIRMED".equals(pr.getStatus())) {
            throw new IllegalStateException("Awaiting receiver confirmation");
        }

        // MPIN check against payer profile
        com.example.Entity.ProfileDto profile = null;
        if (pr.getPayerProfileId() != null) {
            profile = profileRepository.findById(pr.getPayerProfileId()).orElse(null);
        }
        if (profile == null && pr.getPayerEmail() != null) {
            profile = profileRepository.findFirstByEmail(pr.getPayerEmail()).orElse(null);
        }
        if (profile == null || profile.getMpinHash() == null || profile.getMpinHash().isBlank()) {
            throw new IllegalStateException("MPIN not set for payer");
        }
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        if (!encoder.matches(rawMpin, profile.getMpinHash())) {
            throw new IllegalStateException("MPIN mismatch");
        }

        // Finalise
        pr.setStatus("CODE_CONFIRMED");
        pr.setConfirmedAt(now);
        PaymentRequest saved = repository.save(pr);

        // Wallet transfers: debit payer, credit receiver
        java.math.BigDecimal amt = saved.getAmount();
        if (amt != null && amt.compareTo(java.math.BigDecimal.ZERO) > 0) {
            // Debit payer
            if (saved.getPayerEmail() != null) {
                try {
                    new ProfileService(profileRepository).debitMoney(saved.getPayerEmail(), amt);
                } catch (Exception ignored) {}
            }
            // Credit receiver
            if (saved.getReceiverEmail() != null) {
                try {
                    new ProfileService(profileRepository).addMoney(saved.getReceiverEmail(), amt);
                } catch (Exception ignored) {}
            }
        }
        return saved;
    }
    private PaymentRequest confirmCodePrechecks(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Code is required");
        }
        String code = rawCode.trim().toUpperCase();
        PaymentRequest pr = repository.findFirstByCode(code).orElseThrow(() -> new IllegalArgumentException("Code not found"));

        Instant now = Instant.now();
        if (pr.getExpiresAt() != null && now.isAfter(pr.getExpiresAt())) {
            if (!"EXPIRED".equals(pr.getStatus())) {
                pr.setStatus("EXPIRED");
                repository.save(pr);
            }
            throw new IllegalStateException("Code expired");
        }
        if (!"CREATED".equals(pr.getStatus())) {
            throw new IllegalStateException("Code not available");
        }
        return pr;
    }
}
