package com.example.Repository;

import java.util.Optional;
import java.util.List;
import java.time.Instant;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.Entity.PaymentRequest;

@Repository
public interface PaymentRequestRepository extends MongoRepository<PaymentRequest, ObjectId> {
    Optional<PaymentRequest> findFirstByCode(String code);

    List<PaymentRequest> findByStatusAndExpiresAtBefore(String status, Instant expiresBefore);
}
