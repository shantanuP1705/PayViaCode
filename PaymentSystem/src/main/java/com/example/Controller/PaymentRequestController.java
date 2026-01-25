package com.example.Controller;

import java.math.BigDecimal;
import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.Entity.PaymentRequest;
import com.example.Service.PaymentRequestService;
import com.example.Repository.ProfileRepository;
import com.example.Entity.ProfileDto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@RestController
@RequestMapping("/api/payments/requests")
public class PaymentRequestController {

    private final PaymentRequestService service;
    private final ProfileRepository profileRepository;

    public PaymentRequestController(PaymentRequestService service, ProfileRepository profileRepository) {
        this.service = service;
        this.profileRepository = profileRepository;
    }

    @PostMapping
    public ResponseEntity<CreateResponse> create(@RequestBody CreatePayload payload) {
        try {
            ObjectId payerProfileObjectId = null;
            if (payload.getPayerProfileId() != null && !payload.getPayerProfileId().isBlank()) {
                try {
                    payerProfileObjectId = new ObjectId(payload.getPayerProfileId());
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
            }

            PaymentRequest pr = service.create(
                payload.getAmount(),
                payload.getNote(),
                payload.getPayerEmail(),
                payerProfileObjectId
            );
            CreateResponse resp = new CreateResponse();
            resp.setRequestId(pr.getId() != null ? pr.getId().toHexString() : null);
            resp.setCode(pr.getCode());
            resp.setExpiresAt(pr.getExpiresAt());
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/{code}")
    public ResponseEntity<RequestDetails> getByCode(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        return service
            .findByCode(code.trim().toUpperCase())
            .map(pr -> {
                RequestDetails d = new RequestDetails();
                d.setRequestId(pr.getId() != null ? pr.getId().toHexString() : null);
                d.setCode(pr.getCode());
                d.setAmount(pr.getAmount());
                d.setNote(pr.getNote());
                d.setStatus(pr.getStatus());
                d.setCreatedAt(pr.getCreatedAt());
                d.setConfirmedAt(pr.getConfirmedAt());
                d.setExpiresAt(pr.getExpiresAt());
                d.setPayerEmail(pr.getPayerEmail());
                d.setPayerProfileId(pr.getPayerProfileId() != null ? pr.getPayerProfileId().toHexString() : null);
                // Populate receiver profile details if available
                ProfileDto recv = null;
                if (pr.getReceiverProfileId() != null) {
                    recv = profileRepository.findById(pr.getReceiverProfileId()).orElse(null);
                }
                if (recv == null && pr.getReceiverEmail() != null) {
                    recv = profileRepository.findFirstByEmail(pr.getReceiverEmail()).orElse(null);
                }
                if (recv != null) {
                    d.setReceiverAccountHolderName(recv.getAccountHolderName());
                    d.setReceiverAccountNumber(recv.getAccountNumber());
                }
                d.setReceiverEmail(pr.getReceiverEmail());
                d.setReceiverProfileId(pr.getReceiverProfileId() != null ? pr.getReceiverProfileId().toHexString() : null);
                d.setReceiverConfirmedAt(pr.getReceiverConfirmedAt());
                return ResponseEntity.ok(d);
            })
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @Data
    public static class CreatePayload {
        @NotNull
        @DecimalMin(value = "0.01")
        private BigDecimal amount;
        private String note;
        @Email
        private String payerEmail; // optional
        private String payerProfileId; // optional (Mongo ObjectId as hex string)
    }

    @Data
    public static class CreateResponse {
        private String requestId;
        private String code;
        private Instant expiresAt;
    }

    @Data
    public static class RequestDetails {
        private String requestId;
        private String code;
        private java.math.BigDecimal amount;
        private String note;
        private String status;
        private Instant createdAt;
        private Instant confirmedAt;
        private Instant expiresAt;
        private String payerEmail;
        private String payerProfileId;
        private String receiverEmail;
        private String receiverProfileId;
        private String receiverAccountHolderName;
        private String receiverAccountNumber;
        private Instant receiverConfirmedAt;
    }
}
