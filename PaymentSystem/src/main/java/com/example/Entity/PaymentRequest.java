package com.example.Entity;

import java.math.BigDecimal;
import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
@Document(collection = "payment_requests")
public class PaymentRequest {

    @Id
    private ObjectId id;

    @NotNull
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    private String note;

    @Indexed(unique = true)
    private String code;

    private String status; // e.g., CREATED, CODE_CONFIRMED, EXPIRED, COMPLETED

    private Instant createdAt;

    private Instant expiresAt;

    // Timestamp when the receiver confirmed the code (locks the request from reuse)
    private Instant confirmedAt;

    @Email
    private String payerEmail;

    // Reference to payer's profile id (Mongo ObjectId)
    private ObjectId payerProfileId;
}
