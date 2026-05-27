use crate::services::{OrderService, AuditLog};
use std::sync::Arc;

pub mod api {
    pub struct OrderHandler {
        pub service: Arc<OrderService>,
        audit: AuditLog,
    }

    pub enum OrderState {
        Open,
        Closed,
    }

    pub trait Handler {
        fn list(&self) -> Vec<OrderState>;
    }

    impl Handler for OrderHandler {
        fn list(&self) -> Vec<OrderState> {
            self.service.list_orders();
            record_audit();
            Vec::new()
        }
    }

    pub async fn register_routes(handler: OrderHandler) {
        handler.list();
    }

    #[test]
    fn lists_orders() {
        let handler = build_handler();
        handler.list();
    }
}
