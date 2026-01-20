package com.example.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.example.Entity.ProfileDto;
import com.example.Service.ProfileService;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final ProfileService profileService;

    public WalletController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{email}")
    public ResponseEntity<BalanceResponse> getBalance(@PathVariable String email) {
        ProfileDto profile = profileService.getByEmail(email);
        if (profile == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        BalanceResponse resp = new BalanceResponse();
        resp.setEmail(profile.getEmail());
        resp.setBalance(profile.getWalletBalance() != null ? profile.getWalletBalance() : BigDecimal.ZERO);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/add")
    public ResponseEntity<BalanceResponse> addMoney(@RequestBody AddMoneyPayload payload) {
        if (payload == null || payload.getEmail() == null || payload.getAmount() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            ProfileDto profile = profileService.addMoney(payload.getEmail(), payload.getAmount());
            BalanceResponse resp = new BalanceResponse();
            resp.setEmail(profile.getEmail());
            resp.setBalance(profile.getWalletBalance() != null ? profile.getWalletBalance() : BigDecimal.ZERO);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/debit")
    public ResponseEntity<BalanceResponse> debitMoney(@RequestBody AddMoneyPayload payload) {
        if (payload == null || payload.getEmail() == null || payload.getAmount() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            ProfileDto profile = profileService.debitMoney(payload.getEmail(), payload.getAmount());
            BalanceResponse resp = new BalanceResponse();
            resp.setEmail(profile.getEmail());
            resp.setBalance(profile.getWalletBalance() != null ? profile.getWalletBalance() : BigDecimal.ZERO);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @Data
    public static class AddMoneyPayload {
        @Email
        @NotBlank
        private String email;
        @DecimalMin("0.01")
        private BigDecimal amount;
    }

    @Data
    public static class BalanceResponse {
        private String email;
        private BigDecimal balance;
    }
}
