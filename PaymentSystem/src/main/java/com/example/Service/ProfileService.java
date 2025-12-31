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
}
