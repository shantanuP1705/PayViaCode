# Spring Boot Concepts Used in SecurePay Payment System — Interview Guide

> A comprehensive, interview-ready reference of every Spring / Spring Boot concept used in this project, illustrated with **actual code snippets from the codebase**.

---

## Table of Contents

1. [@SpringBootApplication & Auto-Configuration](#1-springbootapplication--auto-configuration)
2. [@ComponentScan — Custom Base Packages](#2-componentscan--custom-base-packages)
3. [@EnableMongoRepositories — Spring Data MongoDB](#3-enablemongorepositories--spring-data-mongodb)
4. [@EnableScheduling & @Scheduled — Task Scheduling](#4-enablescheduling--scheduled--task-scheduling)
5. [Dependency Injection (Constructor Injection)](#5-dependency-injection-constructor-injection)
6. [@RestController & @RequestMapping — REST APIs](#6-restcontroller--requestmapping--rest-apis)
7. [HTTP Method Annotations — @GetMapping, @PostMapping](#7-http-method-annotations--getmapping-postmapping)
8. [@PathVariable & @RequestParam — URL Parameters](#8-pathvariable--requestparam--url-parameters)
9. [@RequestBody — JSON Deserialization](#9-requestbody--json-deserialization)
10. [ResponseEntity — HTTP Response Builder](#10-responseentity--http-response-builder)
11. [Bean Validation (Jakarta Validation)](#11-bean-validation-jakarta-validation)
12. [Spring Data MongoDB — MongoRepository](#12-spring-data-mongodb--mongorepository)
13. [MongoTemplate — Advanced Queries](#13-mongotemplate--advanced-queries)
14. [@Document & @Id — MongoDB Mapping](#14-document--id--mongodb-mapping)
15. [@Indexed — MongoDB Indexes](#15-indexed--mongodb-indexes)
16. [@Configuration & @Bean — Java Config](#16-configuration--bean--java-config)
17. [Spring Security — SecurityFilterChain](#17-spring-security--securityfilterchain)
18. [Custom Servlet Filter — OncePerRequestFilter](#18-custom-servlet-filter--oncerequestfilter)
19. [CORS Configuration — WebMvcConfigurer & CorsConfigurationSource](#19-cors-configuration--webmvcconfigurer--corsconfigurationsource)
20. [@Value — Externalized Configuration](#20-value--externalized-configuration)
21. [application.properties — Externalized Config File](#21-applicationproperties--externalized-config-file)
22. [Lombok Integration — @Data](#22-lombok-integration--data)
23. [DTO Pattern — Inner Static Classes as DTOs](#23-dto-pattern--inner-static-classes-as-dtos)
24. [@Service & @Component — Stereotype Annotations](#24-service--component--stereotype-annotations)
25. [@Repository — Data Access Layer](#25-repository--data-access-layer)
26. [BCryptPasswordEncoder — Password Hashing](#26-bcryptpasswordencoder--password-hashing)
27. [Compensation / Saga Pattern (Manual)](#27-compensation--saga-pattern-manual)
28. [Spring Boot DevTools — Hot Reload](#28-spring-boot-devtools--hot-reload)
29. [Spring Boot Actuator — Health & Monitoring](#29-spring-boot-actuator--health--monitoring)
30. [Token Bucket Rate Limiting — Custom Implementation](#30-token-bucket-rate-limiting--custom-implementation)

---

## 1. `@SpringBootApplication` & Auto-Configuration

### Concept
`@SpringBootApplication` is a convenience meta-annotation that combines:
- **`@Configuration`** — marks the class as a source of bean definitions
- **`@EnableAutoConfiguration`** — tells Spring Boot to auto-configure beans based on classpath dependencies
- **`@ComponentScan`** — scans the current package and sub-packages for Spring components

### Interview Q&A
**Q: What does `@SpringBootApplication` do internally?**
A: It is a composite annotation that combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan`. Spring Boot reads classpath JARs and `META-INF/spring.factories` (or `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`) to auto-configure beans like `MongoTemplate`, `SecurityFilterChain`, embedded Tomcat, etc.

### Code Snippet
```java
@SpringBootApplication
@ComponentScan(basePackages = "com.example")
@EnableMongoRepositories(basePackages = "com.example.Repository")
@EnableScheduling
public class PaymentSystemApplication {
    public static void main(String[] args) {
        SpringApplication.run(PaymentSystemApplication.class, args);
    }
}
```

---

## 2. `@ComponentScan` — Custom Base Packages

### Concept
By default, `@SpringBootApplication` scans only the package where the main class resides and its sub-packages. If your components live outside that hierarchy, you need an explicit `@ComponentScan`.

### Interview Q&A
**Q: Why is `@ComponentScan(basePackages = "com.example")` needed here?**
A: The main class is in `com.example.PaymentSystem`, so Spring would only scan `com.example.PaymentSystem.*` by default. The controllers, services, and configs are in sibling packages (`com.example.Controller`, `com.example.Service`, `com.example.Config`), so we explicitly set `basePackages = "com.example"` to scan all of them.

### Code Snippet
```java
@SpringBootApplication
@ComponentScan(basePackages = "com.example")   // scans Controller, Service, Config, etc.
public class PaymentSystemApplication { ... }
```

---

## 3. `@EnableMongoRepositories` — Spring Data MongoDB

### Concept
Tells Spring to scan the specified package for interfaces extending `MongoRepository` and automatically create proxy implementations at runtime (using JDK dynamic proxies).

### Interview Q&A
**Q: What happens if you don't use `@EnableMongoRepositories`?**
A: If the repository interfaces are not in the same package tree as the main class, Spring won't discover them and will throw a `NoSuchBeanDefinitionException` when you try to inject them.

### Code Snippet
```java
@EnableMongoRepositories(basePackages = "com.example.Repository")
public class PaymentSystemApplication { ... }
```

---

## 4. `@EnableScheduling` & `@Scheduled` — Task Scheduling

### Concept
`@EnableScheduling` activates Spring's scheduled task execution capability. Methods annotated with `@Scheduled` are then invoked automatically based on the specified schedule.

### Interview Q&A
**Q: What is the difference between `fixedDelay` and `fixedRate`?**
A: `fixedDelay` waits for the specified milliseconds **after the previous invocation completes** before starting the next. `fixedRate` triggers every N milliseconds **from the start** of the previous invocation, regardless of whether it has finished.

**Q: What does the scheduler below do?**
A: It runs every 60 seconds, finds all payment requests with status `CREATED` or `RECEIVER_CONFIRMED` whose `expiresAt` is before now, and marks them `EXPIRED` or `FAILED`.

### Code Snippet
```java
@Component
public class PaymentRequestExpiryScheduler {

    private final PaymentRequestRepository repository;
    private final WalletTransactionService txService;

    public PaymentRequestExpiryScheduler(PaymentRequestRepository repository,
                                          WalletTransactionService txService) {
        this.repository = repository;
        this.txService = txService;
    }

    @Scheduled(fixedDelay = 60_000)  // runs every 60 seconds
    public void markExpiredRequests() {
        Instant now = Instant.now();

        List<PaymentRequest> created =
                repository.findByStatusAndExpiresAtBefore("CREATED", now);
        for (PaymentRequest pr : created) {
            pr.setStatus("EXPIRED");
        }
        if (!created.isEmpty()) repository.saveAll(created);

        List<PaymentRequest> receiverConfirmed =
                repository.findByStatusAndExpiresAtBefore("RECEIVER_CONFIRMED", now);
        for (PaymentRequest pr : receiverConfirmed) {
            pr.setStatus("FAILED");
            // Record failure event for both parties
            txService.recordEvent(pr.getPayerEmail(), pr.getAmount(),
                "PAYMENT_FAILED", "Expired without approval - Code " + pr.getCode(),
                pr.getReceiverEmail(), "Failed");
        }
        if (!receiverConfirmed.isEmpty()) repository.saveAll(receiverConfirmed);
    }
}
```

---

## 5. Dependency Injection (Constructor Injection)

### Concept
Spring's IoC (Inversion of Control) container manages object creation and wiring. **Constructor injection** is the recommended approach because:
- Fields can be `final` (immutable)
- Dependencies are explicit and mandatory
- Makes unit testing easier (just pass mocks via constructor)

When a class has **only one constructor**, Spring auto-detects it — no `@Autowired` needed.

### Interview Q&A
**Q: Why is constructor injection preferred over field injection (`@Autowired` on fields)?**
A: Constructor injection enforces immutability (`final` fields), makes dependencies explicit, prevents `NullPointerException` from partially constructed objects, and enables easier unit testing without reflection.

### Code Snippet
```java
@Service
public class PaymentRequestService {

    private final PaymentRequestRepository repository;
    private final ProfileRepository profileRepository;
    private final ProfileService profileService;
    private final WalletTransactionService txService;

    // Single constructor → Spring injects automatically (no @Autowired needed)
    public PaymentRequestService(PaymentRequestRepository repository,
                                  ProfileRepository profileRepository,
                                  ProfileService profileService,
                                  WalletTransactionService txService) {
        this.repository = repository;
        this.profileRepository = profileRepository;
        this.profileService = profileService;
        this.txService = txService;
    }
}
```

---

## 6. `@RestController` & `@RequestMapping` — REST APIs

### Concept
- `@RestController` = `@Controller` + `@ResponseBody`. Every method return value is serialized to JSON (via Jackson) and written to the HTTP response body.
- `@RequestMapping` on the class sets a **base path** prefix for all endpoints in that controller.

### Interview Q&A
**Q: What is the difference between `@Controller` and `@RestController`?**
A: `@Controller` returns view names (for MVC rendering). `@RestController` adds `@ResponseBody` so return values are serialized directly to JSON/XML — suited for REST APIs.

### Code Snippet
```java
@RestController
@RequestMapping("/api/payments/requests")
public class PaymentRequestController {

    @PostMapping
    public ResponseEntity<CreateResponse> create(@RequestBody CreatePayload payload) {
        // POST /api/payments/requests
    }

    @GetMapping("/{code}")
    public ResponseEntity<RequestDetails> getByCode(@PathVariable String code) {
        // GET /api/payments/requests/{code}
    }
}
```

---

## 7. HTTP Method Annotations — `@GetMapping`, `@PostMapping`

### Concept
Shorthand annotations for `@RequestMapping(method = RequestMethod.GET)`, etc.

| Annotation | HTTP Method | Typical Use |
|---|---|---|
| `@GetMapping` | GET | Fetch resource |
| `@PostMapping` | POST | Create / trigger action |
| `@PutMapping` | PUT | Full update |
| `@DeleteMapping` | DELETE | Remove resource |

### Code Snippet
```java
@GetMapping("/{email}")
public ResponseEntity<BalanceResponse> getBalance(@PathVariable String email) { ... }

@PostMapping("/add")
public ResponseEntity<BalanceResponse> addMoney(@RequestBody AddMoneyPayload payload) { ... }

@PostMapping("/debit")
public ResponseEntity<BalanceResponse> debitMoney(@RequestBody AddMoneyPayload payload) { ... }
```

---

## 8. `@PathVariable` & `@RequestParam` — URL Parameters

### Concept
- **`@PathVariable`** extracts a value from the URI template: `/api/profile/{email}`
- **`@RequestParam`** extracts query string parameters: `/api/wallet/transactions/x@y.com?limit=10`

### Interview Q&A
**Q: What is the difference between `@PathVariable` and `@RequestParam`?**
A: `@PathVariable` maps to a segment of the URL path (e.g., `/users/{id}`). `@RequestParam` maps to a query parameter (e.g., `/users?page=1`). Use path variables for resource identification and query params for filtering/pagination.

### Code Snippet
```java
// @PathVariable example
@GetMapping("/{email}")
public ResponseEntity<ProfileDto> get(@PathVariable String email) { ... }

// @RequestParam with defaults
@GetMapping("/{email}")
public ResponseEntity<List<TxResponse>> recent(
        @PathVariable String email,
        @RequestParam(name = "limit", required = false, defaultValue = "10") int limit) {
    ...
}

// Complex filtering with multiple @RequestParam
@GetMapping("/{email}/list")
public ResponseEntity<List<TxResponse>> list(
        @PathVariable String email,
        @RequestParam(name = "type",   required = false) String type,
        @RequestParam(name = "status", required = false) String status,
        @RequestParam(name = "source", required = false) String source,
        @RequestParam(name = "q",      required = false) String q,
        @RequestParam(name = "start",  required = false) String start,
        @RequestParam(name = "end",    required = false) String end,
        @RequestParam(name = "page",   required = false, defaultValue = "0") int page,
        @RequestParam(name = "size",   required = false, defaultValue = "50") int size) {
    ...
}
```

---

## 9. `@RequestBody` — JSON Deserialization

### Concept
`@RequestBody` tells Spring to deserialize the incoming HTTP request body (typically JSON) into a Java object using Jackson's `ObjectMapper`. Combined with `@Valid`, it also triggers Bean Validation.

### Interview Q&A
**Q: How does Spring convert JSON to a Java object?**
A: Spring uses `HttpMessageConverters`. For JSON, it uses `MappingJackson2HttpMessageConverter` which delegates to Jackson's `ObjectMapper.readValue()`. The converter matches the `Content-Type: application/json` header.

### Code Snippet
```java
@PostMapping
public ResponseEntity<ProfileDto> createOrUpdate(@Valid @RequestBody ProfileDto dto) {
    ProfileDto saved = service.save(dto);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
}
```

---

## 10. `ResponseEntity` — HTTP Response Builder

### Concept
`ResponseEntity<T>` gives full control over the HTTP response — status code, headers, and body. It's the recommended return type for REST controllers.

### Interview Q&A
**Q: Why use `ResponseEntity` instead of returning the object directly?**
A: `ResponseEntity` lets you set custom HTTP status codes (`201 CREATED`, `404 NOT_FOUND`, `409 CONFLICT`), add custom response headers, and conditionally return different response structures.

### Code Snippet
```java
// 201 CREATED with body
return ResponseEntity.status(HttpStatus.CREATED).body(resp);

// 200 OK with body
return ResponseEntity.ok(profile);

// 404 NOT FOUND without body
return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

// 204 NO CONTENT
return ResponseEntity.status(HttpStatus.NO_CONTENT).build();

// 409 CONFLICT
return ResponseEntity.status(HttpStatus.CONFLICT).build();

// 429 TOO MANY REQUESTS (in rate limiter)
response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
```

---

## 11. Bean Validation (Jakarta Validation)

### Concept
Spring Boot integrates with the Jakarta Bean Validation API (formerly `javax.validation`). Annotations like `@NotNull`, `@NotBlank`, `@Email`, `@Size`, `@DecimalMin`, `@Pattern` declare constraints. `@Valid` on a `@RequestBody` parameter triggers validation automatically.

### Interview Q&A
**Q: What happens when validation fails?**
A: Spring throws a `MethodArgumentNotValidException`, which by default returns HTTP 400 with error details. You can customize this with `@ExceptionHandler` or `@ControllerAdvice`.

### Code Snippet — Entity-Level Validation
```java
@Data
@Document(collection = "profiles")
public class ProfileDto {

    @NotBlank(message = "Account holder name is required")
    private String accountHolderName;

    @NotBlank(message = "Account number is required")
    @Size(min = 6, max = 20, message = "Account number must be between 6 and 20 characters")
    @Indexed(unique = true)
    private String accountNumber;

    @NotBlank(message = "IFSC is required")
    @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC format")
    @Indexed(unique = true)
    private String ifsc;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Indexed(unique = true)
    private String email;
}
```

### Code Snippet — Payload Validation
```java
@Data
public static class CreatePayload {
    @NotNull
    @DecimalMin(value = "0.01")
    private BigDecimal amount;

    private String note;

    @Email
    private String payerEmail;
}
```

### Code Snippet — Triggering Validation
```java
@PostMapping
public ResponseEntity<ProfileDto> createOrUpdate(@Valid @RequestBody ProfileDto dto) {
    // @Valid triggers validation; invalid input → 400 Bad Request
    ProfileDto saved = service.save(dto);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
}
```

---

## 12. Spring Data MongoDB — `MongoRepository`

### Concept
`MongoRepository<T, ID>` provides CRUD operations, pagination, and **derived query methods** (Spring generates the MongoDB query from the method name).

### Interview Q&A
**Q: How does Spring Data generate queries from method names?**
A: Spring parses the method name by convention. `findFirstByEmail(String email)` becomes: find the first document where the `email` field equals the parameter. `findByStatusAndExpiresAtBefore(String status, Instant time)` becomes: find documents where `status == ?` AND `expiresAt < ?`.

### Code Snippet — ProfileRepository
```java
@Repository
public interface ProfileRepository extends MongoRepository<ProfileDto, ObjectId> {

    Optional<ProfileDto> findFirstByEmail(String email);

    boolean existsByEmail(String email);

    void deleteByEmail(String email);
}
```

### Code Snippet — PaymentRequestRepository
```java
@Repository
public interface PaymentRequestRepository extends MongoRepository<PaymentRequest, ObjectId> {

    Optional<PaymentRequest> findFirstByCode(String code);

    List<PaymentRequest> findByStatusAndExpiresAtBefore(String status, Instant expiresBefore);
}
```

### Code Snippet — WalletTransactionRepository
```java
public interface WalletTransactionRepository extends MongoRepository<WalletTransaction, ObjectId> {

    List<WalletTransaction> findByEmailOrderByCreatedAtDesc(String email, Pageable pageable);
}
```

### Derived Query Keyword Reference

| Keyword | Example | MongoDB Equivalent |
|---|---|---|
| `findBy` | `findByEmail(email)` | `{ email: <email> }` |
| `findFirstBy` | `findFirstByCode(code)` | First match, `{ code: <code> }` |
| `And` | `findByStatusAndExpiresAtBefore(s, t)` | `{ status: s, expiresAt: { $lt: t } }` |
| `Before` | `findByExpiresAtBefore(t)` | `{ expiresAt: { $lt: t } }` |
| `OrderBy...Desc` | `findByEmailOrderByCreatedAtDesc(...)` | Sorted descending on `createdAt` |

---

## 13. `MongoTemplate` — Advanced Queries

### Concept
For complex queries that can't be expressed with derived method names (dynamic filters, regex, OR conditions, pagination), Spring provides `MongoTemplate`. You build `Query` objects programmatically using `Criteria`.

### Interview Q&A
**Q: When would you use `MongoTemplate` over `MongoRepository`?**
A: When you need dynamic query construction (optional filters), complex `$or`/`$and` conditions, regex searches, aggregation pipelines, or raw MongoDB operations that aren't possible with derived method names.

### Code Snippet
```java
@Service
public class WalletTransactionService {

    private final MongoTemplate mongoTemplate;

    public List<WalletTransaction> search(
            String email, String type, String status, String source,
            String q, Instant start, Instant end, int page, int size) {

        Query query = new Query();
        List<Criteria> all = new ArrayList<>();
        all.add(Criteria.where("email").is(email.toLowerCase()));

        // Dynamic optional filters
        if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
            all.add(Criteria.where("type").is(type.toUpperCase()));
        }
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            all.add(Criteria.where("status").is(status));
        }
        if (source != null && !source.isBlank() && !"ALL".equalsIgnoreCase(source)) {
            all.add(Criteria.where("source").is(source));
        }

        // Date range filter
        if (start != null || end != null) {
            Criteria c = Criteria.where("createdAt");
            if (start != null && end != null) all.add(c.gte(start).lte(end));
            else if (start != null) all.add(c.gte(start));
            else all.add(c.lte(end));
        }

        // Text search with regex (case-insensitive)
        if (q != null && !q.isBlank()) {
            String regex = ".*" + Pattern.quote(q.trim()) + ".*";
            Criteria or = new Criteria().orOperator(
                Criteria.where("description").regex(regex, "i"),
                Criteria.where("counterpartyEmail").regex(regex, "i")
            );
            all.add(or);
        }

        query.addCriteria(new Criteria().andOperator(all.toArray(new Criteria[0])));
        query.with(PageRequest.of(Math.max(0, page), Math.min(size, 100)));
        query.with(Sort.by(Sort.Direction.DESC, "createdAt"));

        return mongoTemplate.find(query, WalletTransaction.class);
    }
}
```

---

## 14. `@Document` & `@Id` — MongoDB Mapping

### Concept
- `@Document(collection = "...")` maps a Java class to a MongoDB collection.
- `@Id` marks the primary key field. Typically mapped to MongoDB's `_id`.
- Spring Data auto-converts between `ObjectId` and the `_id` field.

### Interview Q&A
**Q: What is the difference between `String id` and `ObjectId id` for the `@Id` field?**
A: Both work. With `String`, Spring auto-generates a hex string for `_id`. With `ObjectId`, you get the native BSON type directly. `ObjectId` is more efficient for queries and sortable by time (contains a timestamp).

### Code Snippet
```java
@Data
@Document(collection = "payment_requests")
public class PaymentRequest {

    @Id
    private ObjectId id;       // maps to MongoDB _id

    private BigDecimal amount;
    private String code;
    private String status;
    private Instant createdAt;
    private Instant expiresAt;
}

@Data
@Document(collection = "users")
public class User {

    @Id
    private String id;         // auto-generated hex string

    private String firebaseUid;
    private String email;
}
```

---

## 15. `@Indexed` — MongoDB Indexes

### Concept
`@Indexed` creates a MongoDB index on the annotated field for faster queries. `@Indexed(unique = true)` also enforces uniqueness at the database level.

> **Note:** Set `spring.data.mongodb.auto-index-creation=true` in `application.properties` for Spring to auto-create indexes on startup (disabled in this project for production safety).

### Interview Q&A
**Q: Why is `auto-index-creation` disabled in production?**
A: Creating indexes on large collections can lock the database and cause downtime. In production, indexes should be created via migration scripts (`mongosh` or migration tools) during maintenance windows.

### Code Snippet
```java
@Indexed(unique = true)
private String code;           // unique payment code

@Indexed(unique = true)
private String accountNumber;

@Indexed(unique = true)
private String ifsc;

@Indexed(unique = true)
private String email;

@Indexed
private String email;          // non-unique, for fast lookups
```

---

## 16. `@Configuration` & `@Bean` — Java Config

### Concept
- `@Configuration` marks a class as a source of Spring bean definitions (replaces XML config).
- `@Bean` on a method registers the method's return value as a Spring-managed bean.

### Interview Q&A
**Q: What is the difference between `@Component` and `@Bean`?**
A: `@Component` is a class-level annotation — Spring auto-detects and creates the bean. `@Bean` is a method-level annotation inside `@Configuration` — you manually instantiate and configure the bean. Use `@Bean` when you need to configure third-party classes or create multiple beans of the same type.

### Code Snippet
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/**").permitAll()
                .anyRequest().permitAll()
            )
            .addFilterBefore(rateLimitingFilter(),
                             UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public RateLimitingFilter rateLimitingFilter() {
        return new RateLimitingFilter();  // registered as a Spring-managed bean
    }
}
```

---

## 17. Spring Security — `SecurityFilterChain`

### Concept
Spring Security 6+ uses a component-based `SecurityFilterChain` bean (replacing the deprecated `WebSecurityConfigurerAdapter`). The filter chain defines:
- CORS policy
- CSRF protection
- Authentication providers
- Authorization rules
- Custom filters

### Interview Q&A
**Q: Why is CSRF disabled in this project?**
A: This is a stateless REST API consumed by a frontend SPA (Next.js). CSRF protection is designed for session-based apps with server-rendered forms. Stateless APIs use token-based auth (JWT, Firebase tokens), making CSRF unnecessary.

**Q: What does `addFilterBefore(...)` do?**
A: It inserts a custom filter into the filter chain at a specific position. Here, the `RateLimitingFilter` runs **before** the `UsernamePasswordAuthenticationFilter`, so rate limiting happens early in the request lifecycle.

### Code Snippet
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(Customizer.withDefaults())           // apply CORS config
        .csrf(csrf -> csrf.disable())               // disable CSRF for REST API
        .httpBasic(basic -> basic.disable())         // no HTTP Basic auth
        .formLogin(form -> form.disable())           // no form login
        .authorizeHttpRequests(authz -> authz
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()  // preflight
            .requestMatchers("/api/**").permitAll()
            .requestMatchers("/actuator/**").permitAll()
            .anyRequest().permitAll()
        )
        .addFilterBefore(rateLimitingFilter(),
                         UsernamePasswordAuthenticationFilter.class);

    return http.build();
}
```

---

## 18. Custom Servlet Filter — `OncePerRequestFilter`

### Concept
`OncePerRequestFilter` guarantees the filter runs **exactly once per request** (even if the request is forwarded internally). It's the base class for writing custom Spring filters.

### Interview Q&A
**Q: Why extend `OncePerRequestFilter` instead of implementing `javax.servlet.Filter`?**
A: `OncePerRequestFilter` handles dispatcher types (FORWARD, INCLUDE, ERROR) automatically, preventing the filter from executing multiple times for internally forwarded requests.

**Q: What rate-limiting algorithm is used here?**
A: **Token Bucket**. Each client IP gets a bucket with a fixed capacity. Tokens are consumed per request and refilled at a fixed rate. When the bucket is empty, requests get HTTP 429.

### Code Snippet
```java
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, SimpleRateLimiter> limiters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        RateLimitPolicy policy = resolvePolicy(request);
        if (policy == null) {
            filterChain.doFilter(request, response);   // no rate limit
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = clientIp + ":" + policy.getKey();

        SimpleRateLimiter limiter = limiters.computeIfAbsent(key,
            k -> new SimpleRateLimiter(policy.getCapacity(),
                                       policy.getRefillIntervalMillis(),
                                       policy.getRefillTokens()));

        if (!limiter.tryConsume()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());  // 429
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"error\":\"too_many_requests\",\"message\":\"Rate limit exceeded.\"}");
            return;    // short-circuit — don't call filterChain
        }

        filterChain.doFilter(request, response);       // proceed normally
    }

    // Extracts real client IP considering proxies
    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return request.getRemoteAddr();
    }

    // Route-specific rate limits
    private RateLimitPolicy resolvePolicy(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/payments/code/approve"))
            return new RateLimitPolicy("PAYMENT_CODE_APPROVE", 5, 60_000, 5);

        if ("POST".equalsIgnoreCase(method) && uri.startsWith("/api/payments/code/confirm"))
            return new RateLimitPolicy("PAYMENT_CODE_CONFIRM", 10, 60_000, 10);

        if (uri.startsWith("/api/"))
            return new RateLimitPolicy("GENERAL_API", 60, 60_000, 60);

        return null;
    }
}
```

---

## 19. CORS Configuration — `WebMvcConfigurer` & `CorsConfigurationSource`

### Concept
Cross-Origin Resource Sharing (CORS) allows a frontend on `localhost:3000` to call a backend on `localhost:8082`. Spring provides two ways to configure CORS:
1. **`WebMvcConfigurer.addCorsMappings()`** — MVC-level CORS
2. **`CorsConfigurationSource` bean** — Security-level CORS (required when Spring Security is enabled)

Both are needed because Spring Security has its own CORS filter that runs **before** MVC handlers.

### Interview Q&A
**Q: Why do you need CORS configuration in both `WebMvcConfigurer` AND as a `CorsConfigurationSource` bean?**
A: Spring Security intercepts requests before they reach MVC. Without a `CorsConfigurationSource` bean, Spring Security will reject cross-origin preflight (`OPTIONS`) requests even if MVC CORS is configured. The `@Bean` ensures Security applies CORS, and `WebMvcConfigurer` covers non-Security scenarios.

### Code Snippet
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    // MVC-level CORS
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOriginPatterns("http://localhost:*", "http://192.168.*:*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }

    // Security-level CORS
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://192.168.*:*"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## 20. `@Value` — Externalized Configuration

### Concept
`@Value` injects values from `application.properties` (or environment variables) into Spring-managed bean fields. The syntax `${property.name:default}` provides a default if the property is missing.

### Interview Q&A
**Q: What is the `:` in `@Value("${payment.code.ttl-minutes:5}")`?**
A: It sets a **default value**. If `payment.code.ttl-minutes` is not found in `application.properties`, the field will default to `5`.

### Code Snippet
```java
@Service
public class PaymentRequestService {

    @Value("${payment.code.ttl-minutes:5}")
    private int ttlMinutes;   // injected from application.properties

    public PaymentRequest create(BigDecimal amount, String note, ...) {
        pr.setExpiresAt(Instant.now().plus(ttlMinutes, ChronoUnit.MINUTES));
        ...
    }
}
```

**application.properties:**
```properties
payment.code.ttl-minutes=5
```

---

## 21. `application.properties` — Externalized Config File

### Concept
Spring Boot's central configuration file. Properties control server port, database connection, logging, custom settings, and more. Values can be overridden via environment variables, command-line args, or profile-specific files (`application-dev.properties`).

### Interview Q&A
**Q: What is the order of property resolution in Spring Boot?**
A: (Simplified) Command-line args > OS env vars > `application-{profile}.properties` > `application.properties` > `@PropertySource` > Default values.

### Code Snippet
```properties
spring.application.name=PaymentSystem
spring.mongodb.uri=mongodb+srv://user:pass@cluster.mongodb.net/Securepay
spring.data.mongodb.auto-index-creation=false
management.health.mongodb.enabled=false
server.port=8082
logging.level.org.springframework.web.servlet.handler.HandlerMappingIntrospector=ERROR
payment.code.ttl-minutes=5
```

---

## 22. Lombok Integration — `@Data`

### Concept
Project Lombok generates boilerplate code at compile time. `@Data` is a shortcut combining:
- `@Getter` — generates getters for all fields
- `@Setter` — generates setters for all non-final fields
- `@ToString` — generates `toString()`
- `@EqualsAndHashCode` — generates `equals()` and `hashCode()`
- `@RequiredArgsConstructor` — generates constructor for `final` fields

### Interview Q&A
**Q: How does Lombok work if there's no generated code in the source?**
A: Lombok is an **annotation processor** that hooks into the Java compiler (`javac`). It modifies the AST (Abstract Syntax Tree) during compilation, injecting bytecode for getters/setters. IDEs need a Lombok plugin to recognize the generated methods.

### Code Snippet
```java
@Data                                 // generates getters, setters, toString, equals, hashCode
@Document(collection = "wallet_transactions")
public class WalletTransaction {
    @Id
    private ObjectId id;
    private String email;
    private BigDecimal amount;
    private String type;              // CREDIT or DEBIT
    private String source;
    private String description;
    private String counterpartyEmail;
    private Instant createdAt;
    private String status;
}
```

---

## 23. DTO Pattern — Inner Static Classes as DTOs

### Concept
Data Transfer Objects (DTOs) define the shape of request/response payloads, **decoupled from the entity model**. This project uses inner static classes within controllers as lightweight DTOs, keeping payload definitions close to the endpoints that use them.

### Interview Q&A
**Q: Why use DTOs instead of exposing entities directly?**
A: DTOs prevent over-exposure of internal fields (e.g., `mpinHash`), allow different shapes for input/output, support validation specific to the API contract, and decouple the API surface from the database schema.

### Code Snippet
```java
@RestController
@RequestMapping("/api/payments/requests")
public class PaymentRequestController {

    // Request DTO
    @Data
    public static class CreatePayload {
        @NotNull
        @DecimalMin(value = "0.01")
        private BigDecimal amount;
        private String note;
        @Email
        private String payerEmail;
        private String payerProfileId;
    }

    // Response DTO
    @Data
    public static class CreateResponse {
        private String requestId;
        private String code;
        private Instant expiresAt;
    }

    // Detailed response DTO
    @Data
    public static class RequestDetails {
        private String requestId;
        private String code;
        private BigDecimal amount;
        private String note;
        private String status;
        private Instant createdAt;
        private Instant expiresAt;
        private String payerEmail;
        private String receiverEmail;
        private String receiverAccountHolderName;
        private String receiverAccountNumber;
    }
}
```

---

## 24. `@Service` & `@Component` — Stereotype Annotations

### Concept
Spring's stereotype annotations mark classes for auto-detection during component scanning:

| Annotation | Layer | Purpose |
|---|---|---|
| `@Component` | Generic | General-purpose Spring bean |
| `@Service` | Business Logic | Marks service-layer classes |
| `@Repository` | Data Access | Marks DAO classes, adds exception translation |
| `@Controller` | Presentation | Marks MVC controllers |

All are specializations of `@Component` and are functionally equivalent for bean registration — the distinction is semantic.

### Code Snippet
```java
@Service   // Business Logic Layer
public class ProfileService { ... }

@Service
public class PaymentRequestService { ... }

@Service
public class WalletTransactionService { ... }

@Component // Generic component
public class PaymentRequestExpiryScheduler { ... }
```

---

## 25. `@Repository` — Data Access Layer

### Concept
`@Repository` on an interface extending `MongoRepository` tells Spring to:
1. Auto-generate an implementation (proxy) at runtime
2. Translate database-specific exceptions into Spring's `DataAccessException` hierarchy

### Interview Q&A
**Q: Do you need `@Repository` on a `MongoRepository` interface?**
A: Technically no — `@EnableMongoRepositories` discovers interfaces extending `MongoRepository` automatically. However, `@Repository` is conventional and provides exception translation for custom DAO implementations.

### Code Snippet
```java
@Repository
public interface ProfileRepository extends MongoRepository<ProfileDto, ObjectId> {
    Optional<ProfileDto> findFirstByEmail(String email);
    boolean existsByEmail(String email);
    void deleteByEmail(String email);
}

@Repository
public interface PaymentRequestRepository extends MongoRepository<PaymentRequest, ObjectId> {
    Optional<PaymentRequest> findFirstByCode(String code);
    List<PaymentRequest> findByStatusAndExpiresAtBefore(String status, Instant expiresBefore);
}
```

---

## 26. `BCryptPasswordEncoder` — Password Hashing

### Concept
Spring Security provides `BCryptPasswordEncoder` for one-way password hashing. BCrypt automatically embeds a random salt in the hash, protection against rainbow table attacks. Used here for MPIN (Mobile PIN) security.

### Interview Q&A
**Q: Why BCrypt over SHA-256?**
A: BCrypt is intentionally slow (configurable work factor), making brute-force attacks expensive. SHA-256 is fast (designed for data integrity, not password storage). BCrypt also generates unique salts per hash automatically.

**Q: How is the MPIN verified without storing the raw PIN?**
A: The raw MPIN is hashed with `encoder.encode(rawMpin)` when set. During verification, `encoder.matches(rawMpin, storedHash)` re-hashes the input with the stored salt and compares.

### Code Snippet — Setting MPIN
```java
public void setMpin(String email, String rawMpin) {
    if (!rawMpin.matches("^\\d{4,6}$")) {
        throw new IllegalArgumentException("Invalid MPIN format");
    }
    ProfileDto profile = repository.findFirstByEmail(email.toLowerCase())
        .orElseThrow(() -> new IllegalStateException("Profile not found"));

    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    String hash = encoder.encode(rawMpin);         // one-way hash with salt
    profile.setMpinHash(hash);
    profile.setMpinUpdatedAt(Instant.now());
    repository.save(profile);
}
```

### Code Snippet — Verifying MPIN
```java
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
boolean ok = encoder.matches(rawMpin, profile.getMpinHash());  // compare
if (!ok) {
    throw new IllegalStateException("MPIN mismatch");
}
```

---

## 27. Compensation / Saga Pattern (Manual)

### Concept
For distributed operations that span multiple steps (debit payer → credit receiver), a failure mid-way needs compensation (reversal). This project implements a **manual compensation pattern** — if crediting the receiver fails, the payer's debit is reversed.

### Interview Q&A
**Q: What is the Saga pattern?**
A: A Saga is a sequence of local transactions. If one step fails, compensating transactions undo the previous steps. In this project, if `creditReceiver()` fails after `debitPayer()` succeeded, a reversal credit is applied to the payer.

### Code Snippet
```java
try {
    // Step 1: Debit payer
    profileService.debitMoneyWithSource(
        saved.getPayerEmail(), amt, "PAYMENT_SENT",
        "Paid to " + saved.getReceiverEmail(), saved.getReceiverEmail());

    // Step 2: Credit receiver
    profileService.addMoneyWithSource(
        saved.getReceiverEmail(), amt, "PAYMENT_RECEIVED",
        "Received from " + saved.getPayerEmail(), saved.getPayerEmail());

    success = true;
} catch (Exception e) {
    // Compensation: Reverse the payer debit
    try {
        profileService.addMoneyWithSource(
            saved.getPayerEmail(), amt, "REVERSAL",
            "Reversal for failed payment - Code " + saved.getCode(),
            saved.getReceiverEmail());
    } catch (Exception ignore) {}

    // Record failure events
    txService.recordEvent(saved.getPayerEmail(), amt,
        "PAYMENT_FAILED", "Payment failed - Code " + saved.getCode(),
        saved.getReceiverEmail(), "Failed");
}

saved.setStatus(success ? "COMPLETED" : "FAILED");
repository.save(saved);
```

---

## 28. Spring Boot DevTools — Hot Reload

### Concept
`spring-boot-devtools` provides:
- **Automatic restart** when classpath files change
- **LiveReload** for browser auto-refresh
- **Relaxed binding** for development properties

It's scoped as `runtime` and `optional` so it's excluded from production builds.

### Code Snippet (pom.xml)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

---

## 29. Spring Boot Actuator — Health & Monitoring

### Concept
Spring Boot Actuator exposes production-ready endpoints:
- `/actuator/health` — application health status
- `/actuator/info` — application info
- `/actuator/metrics` — JVM and app metrics

### Interview Q&A
**Q: Why is `management.health.mongodb.enabled=false`?**
A: The health endpoint pings MongoDB on every health check. If the database has latency or the connection string is SRV-based (cloud), it may cause unnecessary slow health checks. Disabling it keeps the `/health` endpoint fast.

### Code Snippet (application.properties)
```properties
management.health.mongodb.enabled=false
```

### Code Snippet (SecurityConfig — exposing actuator)
```java
.authorizeHttpRequests(authz -> authz
    .requestMatchers("/actuator/**").permitAll()  // expose actuator endpoints
)
```

---

## 30. Token Bucket Rate Limiting — Custom Implementation

### Concept
The project implements a **token bucket** rate limiter as a custom `OncePerRequestFilter`. Each endpoint group has a separate bucket per client IP with configurable capacity and refill rates.

### How Token Bucket Works
1. A bucket starts full (e.g., capacity = 5 tokens)
2. Each request consumes 1 token
3. Tokens refill at a fixed rate (e.g., 5 tokens per 60 seconds)
4. When empty, requests are rejected with HTTP 429

### Rate Limit Policies in This Project

| Endpoint Pattern | Bucket Key | Capacity | Refill Rate |
|---|---|---|---|
| `POST /api/payments/code/approve` | `PAYMENT_CODE_APPROVE` | 5 / min | 5 tokens |
| `POST /api/payments/code/confirm` | `PAYMENT_CODE_CONFIRM` | 10 / min | 10 tokens |
| `POST /api/payments/requests` | `PAYMENT_REQUEST_CREATE` | 20 / min | 20 tokens |
| `POST /api/wallet/*` | `WALLET_MUTATION` | 20 / min | 20 tokens |
| `/api/profile/**` | `PROFILE_API` | 20 / min | 20 tokens |
| `/api/**` (catch-all) | `GENERAL_API` | 60 / min | 60 tokens |

### Code Snippet — Token Bucket Implementation
```java
private static final class SimpleRateLimiter {
    private final int capacity;
    private final long refillIntervalMillis;
    private final int refillTokens;
    private long lastRefillTimestamp;
    private int availableTokens;

    synchronized boolean tryConsume() {
        refillIfNeeded();
        if (availableTokens > 0) {
            availableTokens--;
            return true;
        }
        return false;   // bucket empty → reject
    }

    private void refillIfNeeded() {
        long now = System.currentTimeMillis();
        long elapsed = now - lastRefillTimestamp;
        long intervals = elapsed / refillIntervalMillis;
        if (intervals > 0) {
            long tokensToAdd = intervals * (long) refillTokens;
            availableTokens = (int) Math.min(capacity, availableTokens + tokensToAdd);
            lastRefillTimestamp += intervals * refillIntervalMillis;
        }
    }
}
```

---

## Summary — All Spring Annotations Used

| Annotation | Where Used | Purpose |
|---|---|---|
| `@SpringBootApplication` | Main class | Entry point + auto-config |
| `@ComponentScan` | Main class | Custom package scanning |
| `@EnableMongoRepositories` | Main class | Enable MongoDB repo proxies |
| `@EnableScheduling` | Main class | Enable `@Scheduled` tasks |
| `@Configuration` | Config classes | Declare bean sources |
| `@EnableWebSecurity` | SecurityConfig | Enable Spring Security |
| `@Bean` | Config methods | Register beans |
| `@RestController` | Controllers | REST endpoint class |
| `@RequestMapping` | Controllers | Base URL path |
| `@GetMapping` | Controller methods | HTTP GET endpoint |
| `@PostMapping` | Controller methods | HTTP POST endpoint |
| `@PathVariable` | Method params | Extract URL path segment |
| `@RequestParam` | Method params | Extract query parameter |
| `@RequestBody` | Method params | Deserialize JSON body |
| `@Valid` | Method params | Trigger bean validation |
| `@Service` | Service classes | Mark business logic bean |
| `@Component` | Scheduler | Mark generic bean |
| `@Repository` | Repository interfaces | Mark data access bean |
| `@Scheduled` | Scheduler method | Periodic execution |
| `@Value` | Service field | Inject property value |
| `@Data` | Entity / DTO classes | Lombok boilerplate gen |
| `@Document` | Entity classes | Map to MongoDB collection |
| `@Id` | Entity fields | Primary key |
| `@Indexed` | Entity fields | MongoDB index |
| `@NotNull` | Validation fields | Must not be null |
| `@NotBlank` | Validation fields | Must not be blank |
| `@Email` | Validation fields | Valid email format |
| `@Size` | Validation fields | String length constraint |
| `@DecimalMin` | Validation fields | Minimum numeric value |
| `@Pattern` | Validation fields | Regex constraint |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js SPA)                  │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP (JSON)
┌────────────────────────────▼─────────────────────────────────┐
│  Spring Security Filter Chain                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  CorsFilter → RateLimitingFilter → AuthorizationFilter  │ │
│  └─────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    REST Controllers                          │
│  PaymentRequestController  ProfileController                 │
│  CodeController            WalletController                  │
│  TransactionController                                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    Service Layer                             │
│  PaymentRequestService   ProfileService                      │
│  WalletTransactionService  PaymentRequestExpiryScheduler     │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              Repository Layer (Spring Data MongoDB)           │
│  ProfileRepository   PaymentRequestRepository                │
│  WalletTransactionRepository                                 │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                    MongoDB Atlas                             │
│  Collections: profiles, payment_requests, wallet_transactions│
└──────────────────────────────────────────────────────────────┘
```

---

## Quick Interview Tips

1. **"Tell me about your project"** — Start with: "I built a secure payment system using Spring Boot with MongoDB Atlas. It features code-based P2P payments, wallet management, MPIN authentication with BCrypt, rate limiting via a custom token-bucket filter, and scheduled expiry of payment codes."

2. **"How do you handle security?"** — "Spring Security filter chain with CORS, rate limiting, BCrypt MPIN hashing, and input validation via Jakarta Bean Validation."

3. **"What design patterns did you use?"** — "Layered architecture (Controller → Service → Repository), DTO pattern for API contracts, Token Bucket for rate limiting, and Saga/Compensation for two-phase wallet transfers."

4. **"How do you handle failures?"** — "Payment transfers use a compensation pattern — if crediting the receiver fails after debiting the payer, the system auto-reverses the debit and records a failure event."

5. **"How does the code-based payment flow work?"** — "Payer creates request → gets 8-char code → Receiver enters code (RECEIVER_CONFIRMED) → Payer approves with MPIN → Wallet transfer → COMPLETED. Codes auto-expire via `@Scheduled`."
