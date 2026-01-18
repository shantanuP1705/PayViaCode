package com.example.Service;

import org.springframework.stereotype.Service;

import com.example.Entity.ProfileDto;
import com.example.Repository.ProfileRepository;
import java.util.Optional;

@Service
public class ProfileService {

    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
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
}
