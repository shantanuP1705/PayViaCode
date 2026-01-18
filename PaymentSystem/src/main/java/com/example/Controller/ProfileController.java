package com.example.Controller;

import com.example.Entity.ProfileDto;
import com.example.Service.ProfileService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
 
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ProfileDto> createOrUpdate(@Valid @RequestBody ProfileDto dto) {
        ProfileDto saved = service.save(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{email}")
    public ResponseEntity<ProfileDto> get(@PathVariable String email) {
        ProfileDto found = service.getByEmail(email);
        if (found == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(found);
    }

    @PostMapping("/{email}/mpin")
    public ResponseEntity<Void> setMpin(@PathVariable String email, @RequestBody SetMpinPayload payload) {
        if (email == null || email.isBlank() || payload == null || payload.getMpin() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        try {
            service.setMpin(email, payload.getMpin());
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @lombok.Data
    public static class SetMpinPayload {
        private String mpin; // raw mpin (digits)
    }
}
