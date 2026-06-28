using SemanticWorkspace.Api.Domain;

namespace SemanticWorkspace.Api.Services;

public class OrderService : IOrderService
{
    private readonly IOrderRepository repository;

    public OrderService(IOrderRepository repository)
    {
        this.repository = repository;
    }

    public async Task<OrderDto?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var order = await repository.FindAsync(id, cancellationToken);
        return order is null ? null : Map(order);
    }

    public Task<OrderDto> CreateAsync(string customerName, decimal total, CancellationToken cancellationToken)
    {
        return CreateAsync(new Order(customerName, total), cancellationToken);
    }

    public async Task<OrderDto> CreateAsync(Order order, CancellationToken cancellationToken)
    {
        var saved = await repository.AddAsync(order, cancellationToken);
        return Map(saved);
    }

    protected virtual OrderDto Map(Order order)
    {
        return new OrderDto(order.Id, order.CustomerName, order.Total);
    }
}

public sealed class DiscountedOrderService : OrderService
{
    public DiscountedOrderService(IOrderRepository repository)
        : base(repository)
    {
    }

    protected override OrderDto Map(Order order)
    {
        var mapped = base.Map(order);
        return mapped with { Total = decimal.Round(mapped.Total * 0.9m, 2) };
    }
}
