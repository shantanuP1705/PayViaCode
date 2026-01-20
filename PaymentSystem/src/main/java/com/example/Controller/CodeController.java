package com.example.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.Entity.PaymentRequest;
import com.example.Service.PaymentRequestService;
import com.example.Repository.ProfileRepository;
import com.example.Entity.ProfileDto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@RestController
@RequestMapping("/api/payments/code")
public class CodeController {

    private final PaymentRequestService service;
    private final ProfileRepository profileRepository;

    public CodeController(PaymentRequestService service, ProfileRepository profileRepository) {
        this.service = service;
        this.profileRepository = profileRepository;
    }

    /**
     * Receiver confirms a payment code (no MPIN). This associates the receiver with
     * the request and moves it to RECEIVER_CONFIRMED.
     */
    @PostMapping("/confirm")
    public ResponseEntity<ConfirmResponse> confirmByReceiver(@RequestBody ConfirmReceiverPayload payload) {
        if (payload == null || payload.getCode() == null || payload.getCode().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            org.bson.types.ObjectId receiverProfileId = null;
            if (payload.getReceiverProfileId() != null && !payload.getReceiverProfileId().isBlank()) {
                try {
                    receiverProfileId = new org.bson.types.ObjectId(payload.getReceiverProfileId());
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
                }
            }

            PaymentRequest pr = service.confirmCodeByReceiver(payload.getCode(), payload.getReceiverEmail(), receiverProfileId);
            ConfirmResponse resp = toResponse(pr);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    /**
     * Payer approves a receiver-confirmed code using MPIN.
     */
    @PostMapping("/approve")
    public ResponseEntity<ConfirmResponse> approveByPayer(@RequestBody ApprovePayload payload) {
        if (payload == null || payload.getCode() == null || payload.getCode().isBlank() || payload.getMpin() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            PaymentRequest pr = service.approveConfirmedCodeWithMpin(payload.getCode(), payload.getMpin());
            ConfirmResponse resp = toResponse(pr);
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
    public static class ConfirmReceiverPayload {
        @NotBlank
        private String code;
        private String receiverEmail; // optional
        private String receiverProfileId; // optional
    }

    @Data
    public static class ApprovePayload {
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
        private String receiverEmail;
        private String receiverProfileId;
        private Instant receiverConfirmedAt;
        private String receiverAccountHolderName;
        private String receiverAccountNumber;
    }

    private ConfirmResponse toResponse(PaymentRequest pr) {
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
        resp.setReceiverEmail(pr.getReceiverEmail());
        resp.setReceiverProfileId(pr.getReceiverProfileId() != null ? pr.getReceiverProfileId().toHexString() : null);
        resp.setReceiverConfirmedAt(pr.getReceiverConfirmedAt());
        // augment with receiver profile details
        ProfileDto recv = null;
        if (pr.getReceiverProfileId() != null) {
            recv = profileRepository.findById(pr.getReceiverProfileId()).orElse(null);
        }
        if (recv == null && pr.getReceiverEmail() != null) {
            recv = profileRepository.findFirstByEmail(pr.getReceiverEmail()).orElse(null);
        }
        if (recv != null) {
            // extend ConfirmResponse with these fields (add them if not present)
            // handled by new fields below
            resp.setReceiverAccountHolderName(recv.getAccountHolderName());
            resp.setReceiverAccountNumber(recv.getAccountNumber());
        }
        return resp;
    }
}
