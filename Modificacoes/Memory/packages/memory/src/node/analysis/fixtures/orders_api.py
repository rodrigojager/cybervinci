from fastapi import APIRouter
from services.orders import OrderService
import pytest

router = APIRouter()


class OrdersController:
    def __init__(self, service: OrderService):
        self.service = service

    @router.get("/orders")
    def list_orders(self):
        return self.service.list_orders()


@router.post("/orders")
def create_order(payload: OrderInput):
    return save_order(payload)


def helper():
    return create_order({})


def test_lists_orders():
    assert helper() is not None
