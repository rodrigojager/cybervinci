#include <vector>
#include "orders/service.hpp"

namespace demo {
class BaseHandler {
public:
    virtual void list() = 0;
};

class OrderHandler : public BaseHandler {
    OrderService* service;
public:
    explicit OrderHandler(OrderService* service) : service(service) {}
    void list() override {
        service->listOrders();
        recordAudit();
    }
};

void registerRoutes(OrderHandler& handler) {
    handler.list();
}
}

void test_register_routes() {
    demo::OrderHandler handler(nullptr);
    registerRoutes(handler);
}
