using LnHook.Api.Interfaces;

namespace LnHook.Api.Services;

public class LnUrlService : ILnUrlService
{
    public string ConvertToLnUrlp(string lightningAddress)
    {
        return lightningAddress.Split('@') switch
        {
            [var username, var domain] when !string.IsNullOrWhiteSpace(username) &&
                                            !string.IsNullOrWhiteSpace(domain)
                => $"https://{domain}/.well-known/lnurlp/{username}",
            _ => throw new ArgumentException("Invalid lightning address")
        };
    }
}
