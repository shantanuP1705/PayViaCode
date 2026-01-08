package com.example.PaymentSystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ComponentScan(basePackages = "com.example")
@EnableMongoRepositories(basePackages = "com.example.Repository")
@EnableScheduling
public class PaymentSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(PaymentSystemApplication.class, args);
	}

}
