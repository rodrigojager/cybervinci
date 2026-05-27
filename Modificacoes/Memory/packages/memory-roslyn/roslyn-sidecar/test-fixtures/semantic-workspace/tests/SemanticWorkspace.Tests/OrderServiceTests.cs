using SemanticWorkspace.Api.Domain;
using SemanticWorkspace.Api.Services;
using Xunit;

namespace SemanticWorkspace.Tests;

public sealed class OrderServiceTests
{
    [Fact]
    public async Task CreateAsync_maps_saved_order()
    {
        var repository = new InMemoryOrderRepository();
        var service = new OrderService(repository);

        var order = await service.CreateAsync("Ada", 42m, CancellationToken.None);

        Assert.Equal("Ada", order.CustomerName);
        Assert.Equal(42m, order.Total);
    }

    private sealed class InMemoryOrderRepository : IOrderRepository
    {
        public Task<Order?> FindAsync(int id, CancellationToken cancellationToken)
        {
            return Task.FromResult<Order?>(new Order(id, "Ada", 42m, DateTimeOffset.UnixEpoch));
        }

        public Task<Order> AddAsync(Order order, CancellationToken cancellationToken)
        {
            return Task.FromResult(order);
        }
    }
}
