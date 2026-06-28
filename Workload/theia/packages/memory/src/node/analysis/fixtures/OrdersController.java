package com.demo.orders;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.junit.jupiter.api.Test;

@RestController
@RequestMapping("/api")
public class OrdersController {
    private final OrderService service;

    public OrdersController(OrderService service) {
        this.service = service;
    }

    @GetMapping("/orders")
    public List<Order> listOrders() {
        return service.listOrders();
    }
}

class OrdersControllerTest {
    @Test
    void listOrders_returnsOrders() {
        new OrdersController(new OrderService()).listOrders();
    }
}
