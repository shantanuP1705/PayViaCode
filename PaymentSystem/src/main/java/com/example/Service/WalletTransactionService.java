package com.example.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.Entity.WalletTransaction;
import com.example.Repository.WalletTransactionRepository;

@Service
public class WalletTransactionService {

    private final WalletTransactionRepository repository;
    private final MongoTemplate mongoTemplate;

    public WalletTransactionService(WalletTransactionRepository repository, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
    }

    public WalletTransaction recordCredit(String email, BigDecimal amount, String source, String description, String counterpartyEmail) {
        WalletTransaction tx = new WalletTransaction();
        tx.setEmail(email != null ? email.toLowerCase() : null);
        tx.setAmount(amount);
        tx.setType("CREDIT");
        tx.setSource(source);
        tx.setDescription(description);
        tx.setCounterpartyEmail(counterpartyEmail != null ? counterpartyEmail.toLowerCase() : null);
        tx.setCreatedAt(Instant.now());
        tx.setStatus("Success");
        return repository.save(tx);
    }

    public WalletTransaction recordDebit(String email, BigDecimal amount, String source, String description, String counterpartyEmail) {
        WalletTransaction tx = new WalletTransaction();
        tx.setEmail(email != null ? email.toLowerCase() : null);
        tx.setAmount(amount);
        tx.setType("DEBIT");
        tx.setSource(source);
        tx.setDescription(description);
        tx.setCounterpartyEmail(counterpartyEmail != null ? counterpartyEmail.toLowerCase() : null);
        tx.setCreatedAt(Instant.now());
        tx.setStatus("Success");
        return repository.save(tx);
    }

    public List<WalletTransaction> getRecent(String email, int limit) {
        int pageSize = Math.max(1, Math.min(limit, 50));
        return repository.findByEmailOrderByCreatedAtDesc(email.toLowerCase(), PageRequest.of(0, pageSize));
    }

    public WalletTransaction recordEvent(String email, BigDecimal amount, String source, String description, String counterpartyEmail, String status) {
        WalletTransaction tx = new WalletTransaction();
        tx.setEmail(email != null ? email.toLowerCase() : null);
        tx.setAmount(amount);
        tx.setType("EVENT");
        tx.setSource(source);
        tx.setDescription(description);
        tx.setCounterpartyEmail(counterpartyEmail != null ? counterpartyEmail.toLowerCase() : null);
        tx.setCreatedAt(Instant.now());
        tx.setStatus(status);
        return repository.save(tx);
    }

    /**
     * Search transactions with optional filters and pagination.
     */
    public List<WalletTransaction> search(
            String email,
            String type,
            String status,
            String source,
            String q,
            Instant start,
            Instant end,
            int page,
            int size) {
        String emailLower = email.toLowerCase();
        Query query = new Query();
        List<Criteria> all = new ArrayList<>();
        all.add(Criteria.where("email").is(emailLower));

        if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
            all.add(Criteria.where("type").is(type.toUpperCase()));
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            all.add(Criteria.where("status").is(status));
        }
        if (source != null && !source.isBlank() && !"ALL".equalsIgnoreCase(source)) {
            all.add(Criteria.where("source").is(source));
        }
        if (start != null || end != null) {
            Criteria c = Criteria.where("createdAt");
            if (start != null && end != null) {
                all.add(c.gte(start).lte(end));
            } else if (start != null) {
                all.add(c.gte(start));
            } else {
                all.add(c.lte(end));
            }
        }
        if (q != null && !q.isBlank()) {
            // case-insensitive partial match on description or counterpartyEmail
            String regex = ".*" + java.util.regex.Pattern.quote(q.trim()) + ".*";
            Criteria or = new Criteria().orOperator(
                Criteria.where("description").regex(regex, "i"),
                Criteria.where("counterpartyEmail").regex(regex, "i")
            );
            all.add(or);
        }

        if (!all.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(all.toArray(new Criteria[0])));
        }

        int pageSize = Math.max(1, Math.min(size, 100));
        int pageIndex = Math.max(0, page);
        query.with(PageRequest.of(pageIndex, pageSize));
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));

        return mongoTemplate.find(query, WalletTransaction.class);
    }
}
