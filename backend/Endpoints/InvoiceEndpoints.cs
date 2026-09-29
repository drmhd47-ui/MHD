using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>
/// الفواتير والمدفوعات — حكر على المدير بالكامل (بما في ذلك القراءة)، تطبيقاً لمصفوفة الصلاحيات.
/// المسودة (Draft) وحدها قابلة للتعديل؛ الإصدار (Issue) يثبّت رقم الفاتورة ورمز QR نهائياً،
/// ولا يوجد مسار حذف على الإطلاق — الإلغاء بعد الإصدار حالة مُسجَّلة لا محو.
/// </summary>
public static class InvoiceEndpoints
{
    public static void MapInvoiceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/invoices").RequireAuthorization("ManagerOnly").WithTags("Invoices");

        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/issue", Issue);
        group.MapPost("/{id:guid}/mark-paid", MarkPaid);
        group.MapPost("/{id:guid}/cancel", Cancel);
        group.MapGet("/vat-status", VatStatus);
    }

    /// <summary>حد التسجيل الإلزامي في ضريبة القيمة المضافة (إيرادات 12 شهراً)، وحد التسجيل الاختياري.</summary>
    public const decimal MandatoryVatThreshold = 375_000m;
    public const decimal VoluntaryVatThreshold = 187_500m;

    /// <summary>
    /// الشركة غير مسجلة في ضريبة القيمة المضافة ما لم تُفعَّل في الإعدادات برقم تسجيل صحيح (15 رقماً).
    /// غير المسجَّل لا يحتسب ضريبة ولا يطبع رقماً ضريبياً ولا يصدر فاتورة ضريبية.
    /// </summary>
    private static async Task<(bool Registered, string? VatNumber, decimal Rate)> VatSetup(AppDbContext db)
    {
        var s = await db.OfficeSettings.FirstOrDefaultAsync();
        var registered = s is { IsVatRegistered: true } && OfficeSettingsEndpoints.IsValidVatNumber(s.VatNumber);
        return (registered, registered ? s!.VatNumber : null, registered ? (s!.DefaultVatRate > 0 ? s.DefaultVatRate : 0.15m) : 0m);
    }

    private record InvoiceLineRequest(string Description, decimal Quantity, decimal UnitPrice);

    private record InvoiceRequest(
        Guid ClientId, Guid? CaseId, DateOnly IssueDate, decimal? VatRate,
        List<InvoiceLineRequest> Lines, List<Guid>? TimeEntryIds, decimal? HourlyRate);

    private record MarkPaidRequest(decimal PaidAmount);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, InvoiceStatus? status, Guid? clientId)
    {
        var query = db.Invoices.Include(i => i.Client).Include(i => i.Case).AsQueryable();
        if (status is not null) query = query.Where(i => i.Status == status);
        if (clientId is not null) query = query.Where(i => i.ClientId == clientId);

        var items = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var item = await db.Invoices.Include(i => i.Client).Include(i => i.Case).Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    private static async Task<(List<InvoiceLine> Lines, List<TimeEntry> BilledEntries, string? Error)> BuildLines(
        InvoiceRequest req, AppDbContext db)
    {
        var lines = new List<InvoiceLine>();
        foreach (var l in req.Lines ?? [])
        {
            if (string.IsNullOrWhiteSpace(l.Description) || l.Quantity <= 0 || l.UnitPrice < 0)
                return ([], [], "بيانات بند الفاتورة غير صحيحة");

            lines.Add(new InvoiceLine
            {
                Description = l.Description.Trim(),
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                LineTotal = l.Quantity * l.UnitPrice
            });
        }

        var billedEntries = new List<TimeEntry>();
        if (req.TimeEntryIds is { Count: > 0 })
        {
            if (req.HourlyRate is null or <= 0)
                return ([], [], "سعر الساعة مطلوب عند إدراج ساعات عمل في الفاتورة");

            billedEntries = await db.TimeEntries.Where(t => req.TimeEntryIds.Contains(t.Id) && !t.IsBilled).ToListAsync();
            if (billedEntries.Count != req.TimeEntryIds.Count)
                return ([], [], "بعض ساعات العمل المحددة غير موجودة أو أُدرجت في فاتورة سابقة");

            foreach (var t in billedEntries)
            {
                lines.Add(new InvoiceLine
                {
                    Description = $"{t.WorkDate:yyyy-MM-dd} — {t.Description}",
                    Quantity = t.Hours,
                    UnitPrice = req.HourlyRate.Value,
                    LineTotal = t.Hours * req.HourlyRate.Value
                });
            }
        }

        if (lines.Count == 0)
            return ([], [], "يجب إضافة بند واحد على الأقل للفاتورة");

        return (lines, billedEntries, null);
    }

    private static async Task<IResult> Create(InvoiceRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (!await db.Clients.AnyAsync(c => c.Id == req.ClientId))
            return Results.BadRequest(new { message = "العميل غير موجود" });

        if (req.CaseId is not null && !await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        var (lines, billedEntries, error) = await BuildLines(req, db);
        if (error is not null) return Results.BadRequest(new { message = error });

        var vat = await VatSetup(db);
        var vatRate = vat.Registered ? (req.VatRate is > 0 ? req.VatRate.Value : vat.Rate) : 0m;

        var subtotal = lines.Sum(l => l.LineTotal);
        var vatAmount = Math.Round(subtotal * vatRate, 2);

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var invoice = new Invoice
        {
            ClientId = req.ClientId,
            CaseId = req.CaseId,
            IssueDate = req.IssueDate,
            Subtotal = subtotal,
            VatRate = vatRate,
            VatAmount = vatAmount,
            Total = subtotal + vatAmount,
            CreatedByUserId = userId,
            Lines = lines
        };
        db.Invoices.Add(invoice);

        foreach (var t in billedEntries) t.IsBilled = true;

        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "INVOICE_CREATED", "Invoice", invoice.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/invoices/{invoice.Id}", invoice);
    }

    private static async Task<IResult> Update(Guid id, InvoiceRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return Results.NotFound();
        if (invoice.Status != InvoiceStatus.Draft)
            return Results.BadRequest(new { message = "لا يمكن تعديل فاتورة صادرة" });

        if (!await db.Clients.AnyAsync(c => c.Id == req.ClientId))
            return Results.BadRequest(new { message = "العميل غير موجود" });

        if (req.CaseId is not null && !await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        // التعديل يعيد كتابة البنود اليدوية فقط؛ ساعات العمل المُدرجة سابقاً لا تُعاد معالجتها هنا.
        var (newLines, _, error) = await BuildLines(req with { TimeEntryIds = null }, db);
        if (error is not null) return Results.BadRequest(new { message = error });

        db.InvoiceLines.RemoveRange(invoice.Lines);
        invoice.ClientId = req.ClientId;
        invoice.CaseId = req.CaseId;
        invoice.IssueDate = req.IssueDate;
        var vat = await VatSetup(db);
        invoice.VatRate = vat.Registered ? (req.VatRate is > 0 ? req.VatRate.Value : vat.Rate) : 0m;
        invoice.Lines = newLines;
        invoice.Subtotal = newLines.Sum(l => l.LineTotal);
        invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatRate, 2);
        invoice.Total = invoice.Subtotal + invoice.VatAmount;

        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "INVOICE_UPDATED", "Invoice", invoice.Id.ToString(), ClientIp(http));
        return Results.Ok(invoice);
    }

    private static async Task<IResult> Issue(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return Results.NotFound();
        if (invoice.Status != InvoiceStatus.Draft)
            return Results.BadRequest(new { message = "الفاتورة صادرة بالفعل" });

        var settings = await db.OfficeSettings.FirstOrDefaultAsync();
        var sellerName = settings?.FirmName ?? "مجموعة إم القانونية";
        var vat = await VatSetup(db);
        // يُثبَّت وضع الضريبة وقت الإصدار: إن لم تكن الشركة مسجلة تصدر فاتورة عادية بلا ضريبة ولا رمز ضريبي،
        // حتى لو أُنشئت المسودة قبل تغيير الإعداد.
        if (!vat.Registered)
        {
            invoice.VatRate = 0m;
            invoice.VatAmount = 0m;
            invoice.Total = invoice.Subtotal;
        }
        var year = DateTime.UtcNow.Year;

        const int maxAttempts = 5;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var countThisYear = await db.Invoices.CountAsync(i => i.InvoiceNumber != null && i.InvoiceNumber.StartsWith($"INV-{year}-"));

            invoice.InvoiceNumber = $"INV-{year}-{countThisYear + 1:D4}";
            invoice.SellerName = sellerName;
            invoice.SellerVatNumber = vat.VatNumber;
            invoice.IsTaxInvoice = vat.Registered;
            invoice.Status = InvoiceStatus.Issued;
            invoice.QrCodeTlvBase64 = vat.Registered
                ? BuildZatcaQrTlv(sellerName, vat.VatNumber!, DateTimeOffset.UtcNow, invoice.Total, invoice.VatAmount)
                : null;

            try
            {
                await db.SaveChangesAsync();
                await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "INVOICE_ISSUED", "Invoice", invoice.Id.ToString(), ClientIp(http));
                return Results.Ok(invoice);
            }
            catch (DbUpdateException)
            {
                if (attempt == maxAttempts)
                    return Results.Json(new { message = "تعذّر إصدار رقم فاتورة فريد، حاول من جديد" }, statusCode: 409);
                // تصادم نادر على رقم الفاتورة الفريد — أعد المحاولة برقم تالٍ.
            }
        }

        return Results.Json(new { message = "تعذّر إصدار رقم فاتورة فريد، حاول من جديد" }, statusCode: 409);
    }

    /// <summary>
    /// مراقبة حد التسجيل: مجموع الفواتير الصادرة (قبل الضريبة) خلال آخر 12 شهراً مقابل حدَّي التسجيل.
    /// تقدير داخلي للتنبيه فقط؛ العبرة بالإيرادات الخاضعة وفق نظام ضريبة القيمة المضافة ولائحته، ويُراجَع مع محاسب.
    /// </summary>
    private static async Task<IResult> VatStatus(AppDbContext db)
    {
        var vat = await VatSetup(db);
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));
        var revenue = (await db.Invoices
            .Where(i => i.Status == InvoiceStatus.Issued || i.Status == InvoiceStatus.Paid)
            .Select(i => new { i.IssueDate, i.Subtotal })
            .ToListAsync())
            .Where(i => i.IssueDate >= since)
            .Sum(i => i.Subtotal);

        var level = vat.Registered ? "registered"
            : revenue > MandatoryVatThreshold ? "mandatory"
            : revenue >= MandatoryVatThreshold * 0.8m ? "approaching"
            : revenue > VoluntaryVatThreshold ? "voluntary"
            : "below";
        return Results.Ok(new
        {
            isVatRegistered = vat.Registered,
            trailing12MonthsRevenue = revenue,
            mandatoryThreshold = MandatoryVatThreshold,
            voluntaryThreshold = VoluntaryVatThreshold,
            level
        });
    }

    private static async Task<IResult> MarkPaid(Guid id, MarkPaidRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return Results.NotFound();
        if (invoice.Status != InvoiceStatus.Issued)
            return Results.BadRequest(new { message = "لا يمكن تسجيل الدفع إلا لفاتورة صادرة" });

        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAt = DateTimeOffset.UtcNow;
        invoice.PaidAmount = req.PaidAmount;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "INVOICE_PAID", "Invoice", id.ToString(), ClientIp(http));
        return Results.Ok(invoice);
    }

    private static async Task<IResult> Cancel(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var invoice = await db.Invoices.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return Results.NotFound();
        if (invoice.Status == InvoiceStatus.Paid)
            return Results.BadRequest(new { message = "لا يمكن إلغاء فاتورة مدفوعة" });

        invoice.Status = InvoiceStatus.Cancelled;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "INVOICE_CANCELLED", "Invoice", id.ToString(), ClientIp(http));
        return Results.Ok(invoice);
    }

    /// <summary>
    /// حمولة TLV بصيغة متوافقة مع متطلبات "فاتورة" (اسم البائع، الرقم الضريبي، التاريخ، الإجمالي، الضريبة)
    /// مُرمَّزة base64. هذا بناء الحقل فقط — الربط الفعلي بالمنصة يستلزم شهادة CSID وتوقيعاً رقمياً
    /// عبر مزوّد معتمد، كما هو موضّح في docs/PROJECT_SPEC.md.
    /// </summary>
    private static string BuildZatcaQrTlv(string sellerName, string vatNumber, DateTimeOffset issuedAt, decimal total, decimal vatAmount)
    {
        using var ms = new MemoryStream();
        WriteTlv(ms, 1, sellerName);
        WriteTlv(ms, 2, vatNumber);
        WriteTlv(ms, 3, issuedAt.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture));
        WriteTlv(ms, 4, total.ToString("F2", CultureInfo.InvariantCulture));
        WriteTlv(ms, 5, vatAmount.ToString("F2", CultureInfo.InvariantCulture));
        return Convert.ToBase64String(ms.ToArray());
    }

    private static void WriteTlv(Stream stream, byte tag, string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value ?? "");
        stream.WriteByte(tag);
        stream.WriteByte((byte)Math.Min(bytes.Length, 255));
        stream.Write(bytes, 0, Math.Min(bytes.Length, 255));
    }
}
