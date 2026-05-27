package orders

import (
    "net/http"
    "github.com/go-chi/chi/v5"
)

type OrderService interface {
    List() []Order
}

type OrderHandler struct {
    OrderService
}

func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
    h.renderOrders(w, h.OrderService.List())
}

func (h *OrderHandler) renderOrders(w http.ResponseWriter, orders []Order) {
    writeJSON(w, orders)
}

func RegisterRoutes(r chi.Router, handler *OrderHandler) {
    r.Get("/orders", handler.ListOrders)
    http.HandleFunc("/health", Health)
}

func Health(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
}

func TestListOrders(t *testing.T) {
    handler := &OrderHandler{}
    handler.ListOrders(nil, nil)
}
