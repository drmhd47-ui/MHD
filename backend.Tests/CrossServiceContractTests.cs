using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MHD.Api.Security;
using Xunit;

namespace MHD.Api.Tests;

/// <summary>
/// عقد التكامل مع خادم الاستقبال (Node.js): المتجه في Vectors/intake-signature.json مولَّد من كود خادم الاستقبال
/// الفعلي (sign و validateSubmission). إن تغيّرت صيغة التوقيع أو شكل الطلب في أحد الطرفين يفشل هذا الاختبار.
/// </summary>
public class CrossServiceContractTests(AppFactory factory) : IClassFixture<AppFactory>
{
    private static JsonElement Vector() =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Vectors", "intake-signature.json"))).RootElement;

    [Fact]
    public void Node_signature_verifies_in_dotnet()
    {
        var v = Vector();
        var secret = Convert.FromBase64String(v.GetProperty("secretB64").GetString()!);
        var ts = v.GetProperty("ts").GetString()!;
        var at = DateTimeOffset.FromUnixTimeSeconds(long.Parse(ts));

        Assert.True(IntakeSignature.IsValid(secret, ts, v.GetProperty("sig").GetString(), v.GetProperty("body").GetString()!, at));
        Assert.False(IntakeSignature.IsValid(secret, ts, v.GetProperty("sig").GetString(), v.GetProperty("body").GetString() + " ", at));
    }

    [Fact]
    public async Task Node_payload_shape_is_accepted_by_the_endpoint()
    {
        var body = Vector().GetProperty("body").GetString()!;
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var sig = Convert.ToBase64String(HMACSHA256.HashData(AppFactory.Secret, Encoding.UTF8.GetBytes($"{ts}.{body}")));
        var msg = new HttpRequestMessage(HttpMethod.Post, "/api/internal/intake-requests") { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        msg.Headers.Add("X-Intake-Timestamp", ts);
        msg.Headers.Add("X-Intake-Signature", sig);

        var res = await factory.CreateClient().SendAsync(msg);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }
}
