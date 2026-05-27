namespace SemanticWorkspace.Api.Domain;

public abstract class Entity
{
    public int Id { get; protected set; }
}

public interface IAuditable
{
    DateTimeOffset CreatedAt { get; }
}

public sealed class Order : Entity, IAuditable
{
    public string CustomerName { get; private set; }
    public decimal Total { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public Order(string customerName, decimal total)
        : this(0, customerName, total, DateTimeOffset.UtcNow)
    {
    }

    public Order(int id, string customerName, decimal total, DateTimeOffset createdAt)
    {
        Id = id;
        CustomerName = customerName;
        Total = total;
        CreatedAt = createdAt;
    }

    public void RenameCustomer(string customerName)
    {
        CustomerName = customerName;
    }
}
