package com.example.Entity;

import java.math.BigDecimal;
import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "wallet_transactions")
public class WalletTransaction {
    @Id
    private ObjectId id;

    @Indexed
    private String email; // owner of the wallet affected

    private BigDecimal amount; // positive number magnitude

    private String type; // CREDIT or DEBIT

    private String source; // ADD_MONEY, PAYMENT_SENT, PAYMENT_RECEIVED, MANUAL_DEBIT, ADJUSTMENT

    private String description; // human friendly note

    private String counterpartyEmail; // other party if any

    private Instant createdAt;

    // Success or Failed (for non-movement events like expired/failed payments)
    private String status; // "Success" or "Failed"
}
