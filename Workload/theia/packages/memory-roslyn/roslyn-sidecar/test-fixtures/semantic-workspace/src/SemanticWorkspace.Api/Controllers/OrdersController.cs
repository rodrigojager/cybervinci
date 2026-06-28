using Microsoft.AspNetCore.Mvc;
using SemanticWorkspace.Api.Services;

namespace SemanticWorkspace.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly IOrderService service;

    public OrdersController(IOrderService service)
    {
        this.service = service;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> Get(int id, CancellationToken cancellationToken)
    {
        var order = await service.GetAsync(id, cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var order = await service.CreateAsync(request.CustomerName, request.Total, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }
}

public sealed record CreateOrderRequest(string CustomerName, decimal Total);
