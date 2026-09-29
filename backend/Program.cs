using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MHD.Api.Data;
using MHD.Api.Endpoints;
using MHD.Api.Security;
using MHD.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    // هامش فوق حد رفع المستند (50 ميجابايت) المفروض في DocumentStorage.
    options.Limits.MaxRequestBodySize = 60 * 1024 * 1024;
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    // Client.Cases <-> Case.Client هي علاقة ثنائية الاتجاه يُعيد EF Core ربطها تلقائياً بين الكيانات
    // المتتبَّعة، فيتكوّن دوران عند تسلسل أي منهما مباشرة إن لم يُتجاهَل.
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<EncryptionService>();
builder.Services.AddSingleton<DocumentStorage>();
builder.Services.AddScoped<AuditLogger>();
builder.Services.AddScoped<ConflictChecker>();
builder.Services.AddSingleton<Notifier>();
builder.Services.AddHostedService<IntakeRetentionService>();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Convert.FromBase64String(jwtKey).Length < 32)
    throw new InvalidOperationException("Jwt:Key يجب أن يكون مُعرَّفاً و32 بايت على الأقل بعد فك base64 (أنشئه بالأمر: openssl rand -base64 48)");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "mhd-legal";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "mhd-legal-client";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        // يضمن أن رموز الغرض المحدود (mfa / pwdchange) لا تُقبل كرموز وصول عادية لبقية الـ API.
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                var purpose = context.Principal?.FindFirst("purpose")?.Value;
                if (purpose != "access")
                    context.Fail("رمز غير صالح لهذا الاستخدام");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("ManagerOnly", p => p.RequireRole("Manager"));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    // بقعدة عدّاد مستقلة عن "login": تأكيد TOTP يمكن أن يُخطئه المستخدم الشرعي مرتين أو ثلاثاً أثناء
    // الإعداد الأول، ولا ينبغي أن يستهلك ذلك من رصيد محاولات الدخول ويقفل حسابه عن الدخول أيضاً.
    options.AddPolicy("totp", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    // نقطة استلام طلبات الموقع: يستدعيها خادم الاستقبال وحده، وتحديدها يحد من أثر أي تسريب للسر المشترك.
    options.AddPolicy("intake-internal", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"message\":\"حدث خطأ غير متوقع في الخادم\"}");
    });
});

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'");
    if (context.Request.IsHttps)
        context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapClientEndpoints();
app.MapCaseEndpoints();
app.MapAuditEndpoints();
app.MapDocumentEndpoints();
app.MapAppointmentEndpoints();
app.MapLegalReferenceEndpoints();
app.MapTimeEntryEndpoints();
app.MapInvoiceEndpoints();
app.MapOfficeSettingsEndpoints();
app.MapIntakeRequestEndpoints();

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // بيئة الاختبارات الآلية تستخدم قاعدة مؤقتة تُنشأ من النموذج مباشرة؛ الإنتاج والتطوير عبر الهجرات فقط.
    if (app.Environment.IsEnvironment("Testing"))
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db, app.Configuration);
}

app.Run();

/// <summary>مرئي لمشروع الاختبارات (WebApplicationFactory).</summary>
public partial class Program;
