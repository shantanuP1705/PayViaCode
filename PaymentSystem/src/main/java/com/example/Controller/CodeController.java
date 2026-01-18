package com.example.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.Entity.PaymentRequest;
import com.example.Service.PaymentRequestService;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@RestController
@RequestMapping("/api/payments/code")
public class CodeController {

    private final PaymentRequestService service;

    public CodeController(PaymentRequestService service) {
        this.service = service;
    }

    /**
     * Confirm a payment code, locking the associated payment request.
     * Returns details if valid; otherwise appropriate error statuses.
     */
    @PostMapping("/confirm")
    public ResponseEntity<ConfirmResponse> confirm(@RequestBody ConfirmPayload payload) {
        if (payload == null || payload.getCode() == null || payload.getCode().isBlank() || payload.getMpin() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            PaymentRequest pr = service.confirmCodeWithMpin(payload.getCode(), payload.getMpin());
            ConfirmResponse resp = new ConfirmResponse();
            resp.setRequestId(pr.getId() != null ? pr.getId().toHexString() : null);
            resp.setCode(pr.getCode());
            resp.setAmount(pr.getAmount());
            resp.setNote(pr.getNote());
            resp.setStatus(pr.getStatus());
            resp.setExpiresAt(pr.getExpiresAt());
            resp.setConfirmedAt(pr.getConfirmedAt());
            resp.setPayerEmail(pr.getPayerEmail());
            resp.setPayerProfileId(pr.getPayerProfileId() != null ? pr.getPayerProfileId().toHexString() : null);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("MPIN")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @Data
    public static class ConfirmPayload {
        @NotBlank
        private String code;
        @NotBlank
        private String mpin;
    }

    @Data
    public static class ConfirmResponse {
        private String requestId;
        private String code;
        private java.math.BigDecimal amount;
        private String note;
        private String status;
        private Instant expiresAt;
        private Instant confirmedAt;
        private String payerEmail;
        private String payerProfileId;
    }
}
