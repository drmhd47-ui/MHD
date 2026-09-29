using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;
using MHD.Api.Services;
using Xunit;

namespace MHD.Api.Tests;

/// <summary>تطبيق كامل على قاعدة SQLite في الذاكرة — نفس نقاط النهاية والتحقق والتدقيق الفعلية.</summary>
public class AppFactory : WebApplicationFactory<Program>
{
    public static readonly byte[] Secret = RandomNumberGenerator.GetBytes(48);
    private readonly SqliteConnection connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        connection.Open();
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Key", Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)));
        builder.UseSetting("Jwt:Issuer", "test");
        builder.UseSetting("Jwt:Audience", "test");
        builder.UseSetting("Security:FieldEncryptionKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
        builder.UseSetting("Storage:RootPath", Path.Combine(Path.GetTempPath(), "mhd-tests-docs"));
        builder.UseSetting("Seed:ManagerEmail", "manager@test.sa");
        builder.UseSetting("Seed:ManagerPassword", "Manager#2026Temp!");
        builder.UseSetting("Intake:SharedSecret", Convert.ToBase64String(Secret));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        connection.Dispose();
    }
}

public class IntakeRequestTests(AppFactory factory) : IClassFixture<AppFactory>
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private static string NewReference() =>
        "MG-" + string.Concat(Enumerable.Range(0, 4).Select(_ => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[RandomNumberGenerator.GetInt32(32)]))
        + "-" + string.Concat(Enumerable.Range(0, 4).Select(_ => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[RandomNumberGenerator.GetInt32(32)]));

    private static object Payload(Guid id, string reference, string name = "مؤسسة الاختبار التجارية", string? opposing = null) => new
    {
        id,
        reference,
        submittedAt = DateTimeOffset.UtcNow,
        language = "ar",
        fullName = name,
        preferredContact = "phone",
        phone = "0551234567",
        email = (string?)null,
        serviceSlug = "litigation",
        serviceTitle = "التقاضي أمام المحاكم",
        opposingPartyName = opposing,
        consentAt = DateTimeOffset.UtcNow,
        privacyPolicyVersion = "2026-09-29"
    };

    private static HttpRequestMessage Signed(object payload, byte[]? secret = null, long? ts = null)
    {
        var body = JsonSerializer.Serialize(payload, Web);
        var timestamp = (ts ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds()).ToString();
        var sig = Convert.ToBase64String(HMACSHA256.HashData(secret ?? AppFactory.Secret, Encoding.UTF8.GetBytes($"{timestamp}.{body}")));
        var msg = new HttpRequestMessage(HttpMethod.Post, "/api/internal/intake-requests")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        msg.Headers.Add("X-Intake-Timestamp", timestamp);
        msg.Headers.Add("X-Intake-Signature", sig);
        return msg;
    }

    private async Task<HttpClient> LawyerClient()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FirstAsync(u => u.Role == UserRole.Manager);
        var token = scope.ServiceProvider.GetRequiredService<JwtTokenService>().CreateAccessToken(user);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Rejects_bad_signature_wrong_secret_and_stale_timestamp()
    {
        var client = factory.CreateClient();
        var payload = Payload(Guid.NewGuid(), NewReference());

        var wrong = await client.SendAsync(Signed(payload, RandomNumberGenerator.GetBytes(48)));
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        var stale = await client.SendAsync(Signed(payload, ts: DateTimeOffset.UtcNow.AddMinutes(-10).ToUnixTimeSeconds()));
        Assert.Equal(HttpStatusCode.Unauthorized, stale.StatusCode);

        var unsigned = await client.PostAsJsonAsync("/api/internal/intake-requests", payload);
        Assert.Equal(HttpStatusCode.Unauthorized, unsigned.StatusCode);
    }

    [Fact]
    public async Task Accepts_signed_request_once_and_returns_409_on_retry()
    {
        var client = factory.CreateClient();
        var id = Guid.NewGuid();
        var payload = Payload(id, NewReference());

        Assert.Equal(HttpStatusCode.Created, (await client.SendAsync(Signed(payload))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.SendAsync(Signed(payload))).StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.IntakeRequests.SingleAsync(r => r.Id == id);
        Assert.Equal(IntakeRequestStatus.New, saved.Status);
        Assert.True(await db.AuditLogs.AnyAsync(a => a.Action == "INTAKE_RECEIVED" && a.EntityId == id.ToString()));
    }

    [Fact]
    public async Task Rejects_invalid_payload()
    {
        var client = factory.CreateClient();
        var bad = new { id = Guid.NewGuid(), reference = "NOT-A-REF", fullName = "x", phone = "123", privacyPolicyVersion = "v" };
        Assert.Equal(HttpStatusCode.BadRequest, (await client.SendAsync(Signed(bad))).StatusCode);
    }

    [Fact]
    public async Task Internal_screens_require_authentication()
    {
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/intake-requests")).StatusCode);
    }

    [Fact]
    public async Task Conversion_is_blocked_by_conflict_until_acknowledged_with_reason()
    {
        // عميل حالي للمكتب، وطلب جديد يذكره طرفاً آخر: تعارض جوهري.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var manager = await db.Users.FirstAsync();
            db.Clients.Add(new Client { Type = ClientType.Company, FullName = "شركة الأفق للتطوير", CreatedByUserId = manager.Id });
            await db.SaveChangesAsync();
        }

        var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.Created,
            (await factory.CreateClient().SendAsync(Signed(Payload(id, NewReference(), "مؤسسة الريادة", opposing: "شركة الأفق للتطوير")))).StatusCode);

        var lawyer = await LawyerClient();
        var detail = await lawyer.GetFromJsonAsync<JsonElement>($"/api/intake-requests/{id}");
        Assert.True(detail.GetProperty("hasBlockingConflict").GetBoolean());
        Assert.Contains(detail.GetProperty("conflicts").EnumerateArray(), c => c.GetProperty("kind").GetString() == "OtherPartyIsClient");

        var blocked = await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/convert", new { type = "Individual", acknowledgeConflicts = false });
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);

        var noReason = await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/convert", new { type = "Individual", acknowledgeConflicts = true, conflictNote = " " });
        Assert.Equal(HttpStatusCode.Conflict, noReason.StatusCode);

        var ok = await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/convert",
            new { type = "Company", acknowledgeConflicts = true, conflictNote = "تشابه أسماء فقط — الطرف المذكور جهة مختلفة بسجل تجاري مختلف" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        using var check = factory.Services.CreateScope();
        var db2 = check.ServiceProvider.GetRequiredService<AppDbContext>();
        var r = await db2.IntakeRequests.SingleAsync(x => x.Id == id);
        Assert.Equal(IntakeRequestStatus.Converted, r.Status);
        Assert.NotNull(r.ConvertedClientId);
        Assert.True(await db2.Clients.AnyAsync(c => c.Id == r.ConvertedClientId && c.FullName == "مؤسسة الريادة"));
        Assert.True(await db2.AuditLogs.AnyAsync(a => a.Action == "INTAKE_CONVERTED_WITH_CONFLICT_ACK" && a.EntityId == id.ToString()));

        // لا يمكن التحويل أو الاعتذار مرة ثانية
        Assert.Equal(HttpStatusCode.Conflict, (await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/decline", new { reason = "x" })).StatusCode);
    }

    [Fact]
    public async Task Decline_then_retention_anonymizes_personal_data()
    {
        var id = Guid.NewGuid();
        await factory.CreateClient().SendAsync(Signed(Payload(id, NewReference(), "اسم للتجهيل", opposing: "طرف ما")));
        var lawyer = await LawyerClient();

        Assert.Equal(HttpStatusCode.BadRequest, (await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/decline", new { reason = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await lawyer.PostAsJsonAsync($"/api/intake-requests/{id}/decline", new { reason = "خارج نطاق الخدمات" })).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var r = await db.IntakeRequests.SingleAsync(x => x.Id == id);
            r.ClosedAt = DateTimeOffset.UtcNow.AddDays(-91);
            await db.SaveChangesAsync();
        }

        var retention = factory.Services.GetServices<Microsoft.Extensions.Hosting.IHostedService>().OfType<IntakeRetentionService>().Single();
        Assert.True(await retention.AnonymizeAsync(90) >= 1);

        using var check = factory.Services.CreateScope();
        var saved = await check.ServiceProvider.GetRequiredService<AppDbContext>().IntakeRequests.SingleAsync(x => x.Id == id);
        Assert.Equal(IntakeRetentionService.AnonymizedName, saved.FullName);
        Assert.Null(saved.Phone);
        Assert.Null(saved.OpposingPartyName);
        Assert.NotNull(saved.AnonymizedAt);
        Assert.Equal(12, saved.Reference.Length);
    }

    [Fact]
    public async Task Summary_counts_new_requests()
    {
        await factory.CreateClient().SendAsync(Signed(Payload(Guid.NewGuid(), NewReference())));
        var lawyer = await LawyerClient();
        var summary = await lawyer.GetFromJsonAsync<JsonElement>("/api/intake-requests/summary");
        Assert.True(summary.GetProperty("newCount").GetInt32() >= 1);
    }
}
