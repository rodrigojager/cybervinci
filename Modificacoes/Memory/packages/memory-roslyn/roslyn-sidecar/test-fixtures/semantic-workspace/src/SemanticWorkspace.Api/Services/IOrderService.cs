namespace SemanticWorkspace.Api.Services;

public interface IOrderService
{
    Task<OrderDto?> GetAsync(int id, CancellationToken cancellationToken);
    Task<OrderDto> CreateAsync(string customerName, decimal total, CancellationToken cancellationToken);
}

public sealed record OrderDto(int Id, string CustomerName, decimal Total);
