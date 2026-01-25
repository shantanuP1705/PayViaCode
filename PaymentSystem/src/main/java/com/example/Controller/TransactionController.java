package com.example.Controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.Entity.WalletTransaction;
import com.example.Service.WalletTransactionService;

import lombok.Data;

@RestController
@RequestMapping("/api/wallet/transactions")
public class TransactionController {

    private final WalletTransactionService txService;

    public TransactionController(WalletTransactionService txService) {
        this.txService = txService;
    }

    @GetMapping("/{email}")
    public ResponseEntity<List<TxResponse>> recent(@PathVariable String email, @RequestParam(name = "limit", required = false, defaultValue = "10") int limit) {
        List<WalletTransaction> list = txService.getRecent(email, limit);
        List<TxResponse> resp = list.stream().map(wt -> {
            TxResponse r = new TxResponse();
            r.setEmail(wt.getEmail());
            r.setType(wt.getType());
            r.setSource(wt.getSource());
            r.setDescription(wt.getDescription());
            r.setAmount(wt.getAmount());
            r.setCounterpartyEmail(wt.getCounterpartyEmail());
            r.setCreatedAt(wt.getCreatedAt());
            r.setStatus(wt.getStatus() != null ? wt.getStatus() : "Success");
            return r;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{email}/list")
    public ResponseEntity<List<TxResponse>> list(
            @PathVariable String email,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "page", required = false, defaultValue = "0") int page,
            @RequestParam(name = "size", required = false, defaultValue = "50") int size) {

        java.time.Instant startInst = null;
        java.time.Instant endInst = null;
        try {
            if (start != null && !start.isBlank()) startInst = java.time.Instant.parse(start);
        } catch (Exception ignore) {}
        try {
            if (end != null && !end.isBlank()) endInst = java.time.Instant.parse(end);
        } catch (Exception ignore) {}

        List<WalletTransaction> list = txService.search(email, type, status, source, q, startInst, endInst, page, size);
        List<TxResponse> resp = list.stream().map(wt -> {
            TxResponse r = new TxResponse();
            r.setEmail(wt.getEmail());
            r.setType(wt.getType());
            r.setSource(wt.getSource());
            r.setDescription(wt.getDescription());
            r.setAmount(wt.getAmount());
            r.setCounterpartyEmail(wt.getCounterpartyEmail());
            r.setCreatedAt(wt.getCreatedAt());
            r.setStatus(wt.getStatus() != null ? wt.getStatus() : "Success");
            return r;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }

    @Data
    public static class TxResponse {
        private String email;
        private String type; // CREDIT or DEBIT
        private String source;
        private String description;
        private java.math.BigDecimal amount;
        private String counterpartyEmail;
        private java.time.Instant createdAt;
        private String status;
    }
}
