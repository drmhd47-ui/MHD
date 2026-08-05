using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

public static class DocumentEndpoints
{
    public static void MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var caseGroup = app.MapGroup("/api/cases/{caseId:guid}/documents").RequireAuthorization().WithTags("Documents");
        caseGroup.MapGet("/", List);
        caseGroup.MapPost("/", Upload).DisableAntiforgery();

        var docGroup = app.MapGroup("/api/documents").RequireAuthorization().WithTags("Documents");
        docGroup.MapGet("/{id:guid}/download", Download);
        docGroup.MapPost("/{id:guid}/archive", Archive);
    }

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(Guid caseId, AppDbContext db, bool includeArchived = false)
    {
        var query = db.Documents.Where(d => d.CaseId == caseId);
        if (!includeArchived) query = query.Where(d => !d.IsArchived);

        var items = await query
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new { d.Id, d.FileName, d.ContentType, d.SizeBytes, d.IsArchived, d.UploadedAt })
            .ToListAsync();

        return Results.Ok(items);
    }

    private static async Task<IResult> Upload(Guid caseId, IFormFile? file, AppDbContext db, DocumentStorage storage, AuditLogger audit, HttpContext http)
    {
        var caseExists = await db.Cases.AnyAsync(c => c.Id == caseId);
        if (!caseExists) return Results.NotFound(new { message = "القضية غير موجودة" });

        if (file is null || file.Length == 0)
            return Results.BadRequest(new { message = "الملف مطلوب" });

        if (DocumentStorage.ExceedsMaxSize(file.Length))
            return Results.BadRequest(new { message = "حجم الملف يتجاوز الحد الأقصى (50 ميجابايت)" });

        if (!DocumentStorage.IsExtensionAllowed(file.FileName))
            return Results.BadRequest(new { message = "امتداد الملف غير مسموح به" });

        var documentId = Guid.NewGuid();
        byte[] content;
        using (var ms = new MemoryStream())
        {
            await file.CopyToAsync(ms);
            content = ms.ToArray();
        }

        var (storagePath, sha256) = await storage.SaveAsync(documentId, content);
        var userId = JwtTokenService.GetUserId(http.User)!.Value;

        var doc = new Document
        {
            Id = documentId,
            CaseId = caseId,
            FileName = file.FileName,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            Sha256Fingerprint = sha256,
            StoragePath = storagePath,
            UploadedByUserId = userId
        };
        db.Documents.Add(doc);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "DOCUMENT_UPLOADED", "Document", doc.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/documents/{doc.Id}", new { doc.Id, doc.FileName, doc.SizeBytes, doc.UploadedAt });
    }

    private static async Task<IResult> Download(Guid id, AppDbContext db, DocumentStorage storage, AuditLogger audit, HttpContext http)
    {
        var doc = await db.Documents.FindAsync(id);
        if (doc is null) return Results.NotFound();

        var content = await storage.LoadAsync(doc.StoragePath);
        var actualSha256 = Convert.ToHexString(SHA256.HashData(content));
        if (!string.Equals(actualSha256, doc.Sha256Fingerprint, StringComparison.OrdinalIgnoreCase))
        {
            await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "DOCUMENT_INTEGRITY_FAILED", "Document", id.ToString(), ClientIp(http));
            return Results.Json(new { message = "فشل التحقق من سلامة الملف — قد يكون تعرّض للتلاعب" }, statusCode: 500);
        }

        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "DOCUMENT_DOWNLOADED", "Document", id.ToString(), ClientIp(http));
        return Results.File(content, doc.ContentType, doc.FileName);
    }

    private static async Task<IResult> Archive(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var doc = await db.Documents.FindAsync(id);
        if (doc is null) return Results.NotFound();

        doc.IsArchived = true;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "DOCUMENT_ARCHIVED", "Document", id.ToString(), ClientIp(http));
        return Results.NoContent();
    }
}
