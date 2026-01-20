package com.example.Entity;

import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.annotation.Id;
import org.bson.types.ObjectId;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Document(collection = "profiles")
public class ProfileDto {

    @Id
    private ObjectId id; // MongoDB ObjectId

    @NotBlank(message = "Account holder name is required")
    private String accountHolderName;

    @NotBlank(message = "Account number is required")
    @Size(min = 6, max = 20, message = "Account number must be between 6 and 20 characters")
    @Indexed(unique = true)
    private String accountNumber;

    @NotBlank(message = "Bank name is required")
    private String bankName;

    @NotBlank(message = "IFSC is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC format")
    @Indexed(unique = true)
    private String ifsc;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Indexed(unique = true)
    private String email;
 
    // Hashed MPIN for payer authentication (BCrypt). Optional until set by user.
    private String mpinHash;

    // When the MPIN was last updated
    private java.time.Instant mpinUpdatedAt;

    // Wallet balance associated with this profile
    private java.math.BigDecimal walletBalance;
}
