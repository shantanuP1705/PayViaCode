package com.example.Entity;

import java.time.LocalDateTime;

import lombok.Data;
 
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "users")
public class User{
 @Id
    private String id;           // MongoDB ID
    private String firebaseUid;  // Firebase UID (unique)
    private String email;
    private String name;
    private String photoURL;


    private String role;         // payer/receiver
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;


   
}