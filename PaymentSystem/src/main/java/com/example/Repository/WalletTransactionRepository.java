package com.example.Repository;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.Entity.WalletTransaction;

public interface WalletTransactionRepository extends MongoRepository<WalletTransaction, ObjectId> {
    List<WalletTransaction> findByEmailOrderByCreatedAtDesc(String email, Pageable pageable);
}
