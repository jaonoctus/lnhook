using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using LnHook.Api.Interfaces;
using LnHook.Api.Responses;

namespace LnHook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class WrapController(
    ILnUrlService lnUrlService
): ControllerBase
{
    [HttpGet("lightning-address")]
    public WrapLightningAddressResponse WrapLightningAddress(
        [FromQuery][Required][EmailAddress] string address,
        [FromQuery][Required][Range(21_000, 500_000_000)] int amount
    )
    {
        var lnurlp = lnUrlService.ConvertToLnUrlp(address);

        // TODO
        Console.WriteLine("generate invoice to calculate fee");
        Console.WriteLine("");

        var fee = 1_000;

        return new()
        {
            Id = "teste",
            Original = new()
            {
                Pr = "invoice here",
                Amount = amount - fee
            },
            Wrapped = new()
            {
                Pr = "invoice here",
                Amount = amount
            }
        };
    }
}
