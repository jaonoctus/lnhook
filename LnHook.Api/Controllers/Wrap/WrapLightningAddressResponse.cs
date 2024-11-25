using System.ComponentModel.DataAnnotations;

namespace LnHook.Api.Responses;

public record InvoiceDetails
{
    [Required] public required string Pr { get; init; }
    [Required] public required int Amount { get; init; }
}

public record WrapLightningAddressResponse
{
    [Required] public required string Id { get; init; }
    [Required] public required InvoiceDetails Original { get; init; }
    [Required] public required InvoiceDetails Wrapped { get; init; }
};
