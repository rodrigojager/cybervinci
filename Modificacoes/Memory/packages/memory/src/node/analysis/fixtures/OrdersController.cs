using Xunit;

namespace Demo.Api;

public class OrdersController : ControllerBase
{
    private readonly IOrderService service;

    public OrdersController(IOrderService service)
    {
        this.service = service;
    }

    [HttpGet("orders")]
    public IActionResult Get()
    {
        return Ok(service.List());
    }
}

public class OrdersControllerTests
{
    [Fact]
    public void Get_returns_orders()
    {
    }
}
