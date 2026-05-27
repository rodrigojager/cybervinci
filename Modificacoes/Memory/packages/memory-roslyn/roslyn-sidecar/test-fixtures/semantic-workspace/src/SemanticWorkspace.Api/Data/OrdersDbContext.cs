using Microsoft.EntityFrameworkCore;
using SemanticWorkspace.Api.Domain;

namespace SemanticWorkspace.Api.Data;

public sealed class OrdersDbContext : DbContext
{
    public OrdersDbContext(DbContextOptions<OrdersDbContext> options)
        : base(options)
    {
    }

    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>()
            .HasKey(order => order.Id);

        modelBuilder.Entity<Order>()
            .Property(order => order.CustomerName)
            .HasMaxLength(120)
            .IsRequired();
    }
}
