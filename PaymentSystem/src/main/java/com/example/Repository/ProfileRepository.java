package com.example.Repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import org.bson.types.ObjectId;

import com.example.Entity.ProfileDto;
import java.util.Optional;

@Repository
public interface ProfileRepository extends MongoRepository<ProfileDto, ObjectId> {

    Optional<ProfileDto> findFirstByEmail(String email);

    boolean existsByEmail(String email);

    void deleteByEmail(String email);
}
