using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>إعدادات المكتب — صف واحد فقط، حكر على المدير. تُستخدم في بناء الفواتير (اسم البائع والرقم الضريبي).</summary>
public static class OfficeSettingsEndpoints
{
    public static void MapOfficeSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/office-settings").RequireAuthorization("ManagerOnly").WithTags("OfficeSettings");

        group.MapGet("/", Get);
        group.MapPut("/", Update);
    }

    private record OfficeSettingsRequest(
        string FirmName, string? VatNumber, string? CommercialRegistrationNumber,
        string? Address, string? Phone, string? Email, decimal DefaultVatRate, Guid? OnDutyUserId);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    /// <summary>يضمن وجود صف إعدادات واحد دائماً حتى لو تعذّرت التهيئة الأولية عند الإقلاع.</summary>
    private static async Task<OfficeSettings> GetOrCreate(AppDbContext db)
    {
        var settings = await db.OfficeSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new OfficeSettings();
            db.OfficeSettings.Add(settings);
            await db.SaveChangesAsync();
        }
        return settings;
    }

    private static async Task<IResult> Get(AppDbContext db) => Results.Ok(await GetOrCreate(db));

    private static async Task<IResult> Update(OfficeSettingsRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.FirmName))
            return Results.BadRequest(new { message = "اسم المكتب مطلوب" });

        var settings = await GetOrCreate(db);
        settings.FirmName = req.FirmName.Trim();
        settings.VatNumber = req.VatNumber;
        settings.CommercialRegistrationNumber = req.CommercialRegistrationNumber;
        settings.Address = req.Address;
        settings.Phone = req.Phone;
        settings.Email = req.Email;
        settings.DefaultVatRate = req.DefaultVatRate;

        if (req.OnDutyUserId is Guid onDuty && !await db.Users.AnyAsync(u => u.Id == onDuty && u.IsActive))
            return Results.BadRequest(new { message = "المحامي المناوب غير موجود أو معطّل" });
        settings.OnDutyUserId = req.OnDutyUserId;
        settings.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "OFFICE_SETTINGS_UPDATED", "OfficeSettings", settings.Id.ToString(), ClientIp(http));
        return Results.Ok(settings);
    }
}
