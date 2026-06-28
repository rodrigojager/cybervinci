using SemanticWorkspace.Api.Domain;

namespace SemanticWorkspace.Api.Services;

public interface IOrderRepository
{
    Task<Order?> FindAsync(int id, CancellationToken cancellationToken);
    Task<Order> AddAsync(Order order, CancellationToken cancellationToken);
}
