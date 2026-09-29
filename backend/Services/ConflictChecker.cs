using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;

namespace MHD.Api.Services;

public record ConflictMatch(Guid Id, string FullName, string Reason);

/// <summary>
/// فحص تعارض المصالح: يبحث في العملاء الحاليين وفي أسماء الأطراف المقابلة بالقضايا القائمة.
/// مشترك بين شاشة العملاء وطلبات الموقع الواردة، فلا يختلف منطق الفحص بين المسارين.
/// </summary>
public class ConflictChecker(AppDbContext db)
{
    public async Task<List<ConflictMatch>> CheckAsync(string? q)
    {
        var term = (q ?? "").Trim();
        if (term.Length < 3) return [];

        var clientMatches = await db.Clients
            .Where(c => c.FullName.Contains(term) || (c.NationalIdOrCr != null && c.NationalIdOrCr.Contains(term)))
            .Select(c => new ConflictMatch(c.Id, c.FullName, "عميل حالي للمكتب"))
            .ToListAsync();

        var opposingMatches = await db.Cases
            .Where(c => c.OpposingPartyName != null && c.OpposingPartyName.Contains(term))
            .Select(c => new ConflictMatch(c.Id, c.OpposingPartyName!, "طرف مقابل في قضية قائمة: " + c.CaseNumber))
            .ToListAsync();

        return [.. clientMatches, .. opposingMatches];
    }
}
