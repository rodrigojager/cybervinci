# Semantic C# Workspace Fixture

This fixture is a compact ASP.NET Core solution for Memory semantic analysis tests.

It intentionally includes:

- overloads in `Order` and `OrderService`
- `IOrderService`, `IOrderRepository`, and `IAuditable` interfaces
- inheritance through `Entity` and `DiscountedOrderService`
- an ASP.NET controller with `HttpGet` and `HttpPost` endpoints
- `OrdersDbContext` with a `DbSet<Order>` and model configuration
- DI registrations in `Program.cs`
- an xUnit test with an in-memory repository

The fixture is source-only. It is not restored or built by the normal TypeScript package build.
