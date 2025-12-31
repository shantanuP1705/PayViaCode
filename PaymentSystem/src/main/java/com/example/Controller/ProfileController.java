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
}
