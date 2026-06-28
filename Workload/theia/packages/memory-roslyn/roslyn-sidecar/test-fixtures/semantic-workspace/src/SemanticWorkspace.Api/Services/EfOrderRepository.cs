using Microsoft.EntityFrameworkCore;
using SemanticWorkspace.Api.Data;
using SemanticWorkspace.Api.Domain;

namespace SemanticWorkspace.Api.Services;

public sealed class EfOrderRepository : IOrderRepository
{
    private readonly OrdersDbContext dbContext;

    public EfOrderRepository(OrdersDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public Task<Order?> FindAsync(int id, CancellationToken cancellationToken)
    {
        return dbContext.Orders.FirstOrDefaultAsync(order => order.Id == id, cancellationToken);
    }

    public async Task<Order> AddAsync(Order order, CancellationToken cancellationToken)
    {
        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);
        return order;
    }
}
