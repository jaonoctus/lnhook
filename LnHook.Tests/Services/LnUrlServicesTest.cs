using LnHook.Api.Interfaces;
using LnHook.Api.Services;

namespace LnHook.Tests.Services;

public class LnUrlServicesTest
{
    private readonly ILnUrlService service = new LnUrlService();

    [Fact(DisplayName = "ConvertToLnUrl should return lnurl when lightning address is valid")]
    public void ConvertToLnUrl_ShouldReturnLnUrl_WhenLightningAddressIsValid()
    {
        var lightningAddress = "jaonoctus@zbd.gg";

        var result = service.ConvertToLnUrlp(lightningAddress);

        Assert.Equal("https://zbd.gg/.well-known/lnurlp/jaonoctus", result);
    }

    [Fact(DisplayName = "ConvertToLnUrl should throw exception when lightning address is empty")]
    public void ConvertToLnUrl_ShouldThrowException_WhenLightningAddressIsEmpty()
    {
        var lightningAddress = String.Empty;

        Assert.Throws<ArgumentException>(() => service.ConvertToLnUrlp(lightningAddress));
    }

    [Fact(DisplayName = "ConvertToLnUrl should throw exception when lightning address is invalid")]
    public void ConvertToLnUrl_ShouldThrowException_WhenLightningAddressIsUndefined()
    {
        var lightningAddress = "notvalid@";

        Assert.Throws<ArgumentException>(() => service.ConvertToLnUrlp(lightningAddress));
    }
}
