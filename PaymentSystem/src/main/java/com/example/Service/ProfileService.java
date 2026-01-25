package com.example.Service;

import org.springframework.stereotype.Service;

import com.example.Entity.ProfileDto;
import com.example.Repository.ProfileRepository;
import java.util.Optional;

@Service
public class ProfileService {

    private final ProfileRepository repository;
    private final WalletTransactionService txService;

    public ProfileService(ProfileRepository repository, WalletTransactionService txService) {
        this.repository = repository;
        this.txService = txService;
    }

    public ProfileDto save(ProfileDto dto) {
        if (dto == null || dto.getEmail() == null) {
            return null;
        }
        // normalize email
        dto.setEmail(dto.getEmail().toLowerCase());
        // upsert by email: if exists, reuse the same id to update
        Optional<ProfileDto> existing = repository.findFirstByEmail(dto.getEmail());
        if (existing.isPresent()) {
            dto.setId(existing.get().getId());
        }
        return repository.save(dto);
    }

    public ProfileDto getByEmail(String email) {
        if (email == null) return null;
        return repository.findFirstByEmail(email.toLowerCase()).orElse(null);
    }

    public void setMpin(String email, String rawMpin) {
        if (email == null || rawMpin == null) throw new IllegalArgumentException("Email and MPIN required");
        String normalizedEmail = email.toLowerCase();
        // MPIN must be 4-6 digits
        if (!rawMpin.matches("^\\d{4,6}$")) {
            throw new IllegalArgumentException("Invalid MPIN format");
        }
        ProfileDto profile = repository.findFirstByEmail(normalizedEmail)
            .orElseThrow(() -> new IllegalStateException("Profile not found"));

        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        String hash = encoder.encode(rawMpin);
        profile.setMpinHash(hash);
        profile.setMpinUpdatedAt(java.time.Instant.now());
        repository.save(profile);
    }

    public ProfileDto addMoney(String email, java.math.BigDecimal amount) {
        if (email == null || amount == null) throw new IllegalArgumentException("Email and amount required");
        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Amount must be positive");
        ProfileDto profile = repository.findFirstByEmail(email.toLowerCase()).orElseThrow(() -> new IllegalStateException("Profile not found"));
        java.math.BigDecimal current = profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO;
        profile.setWalletBalance(current.add(amount));
        ProfileDto saved = repository.save(profile);
        // default transaction record
        txService.recordCredit(saved.getEmail(), amount, "ADJUSTMENT", "Wallet credit", null);
        return saved;
    }

    public ProfileDto debitMoney(String email, java.math.BigDecimal amount) {
        if (email == null || amount == null) throw new IllegalArgumentException("Email and amount required");
        if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("Amount must be positive");
        ProfileDto profile = repository.findFirstByEmail(email.toLowerCase()).orElseThrow(() -> new IllegalStateException("Profile not found"));
        java.math.BigDecimal current = profile.getWalletBalance() != null ? profile.getWalletBalance() : java.math.BigDecimal.ZERO;
        if (current.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient balance");
        }
        profile.setWalletBalance(current.subtract(amount));
        ProfileDto saved = repository.save(profile);
        // default transaction record
        txService.recordDebit(saved.getEmail(), amount, "ADJUSTMENT", "Wallet debit", null);
        return saved;
    }

    public ProfileDto addMoneyWithSource(String email, java.math.BigDecimal amount, String source, String description, String counterpartyEmail) {
        ProfileDto saved = addMoney(email, amount);
        // overwrite a more specific transaction record for clarity
        txService.recordCredit(saved.getEmail(), amount, source, description, counterpartyEmail);
        return saved;
    }

    public ProfileDto debitMoneyWithSource(String email, java.math.BigDecimal amount, String source, String description, String counterpartyEmail) {
        ProfileDto saved = debitMoney(email, amount);
        txService.recordDebit(saved.getEmail(), amount, source, description, counterpartyEmail);
        return saved;
    }
}
