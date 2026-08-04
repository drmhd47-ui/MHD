using MHD.Api.Data;
using MHD.Api.Domain;

namespace MHD.Api.Security;

public class AuditLogger(AppDbContext db)
{
    public async Task LogAsync(Guid? userId, string userName, string action, string entityType, string? entityId, string ipAddress, string? details = null)
    {
        db.AuditLogs.Add(new AuditLogEntry
        {
            UserId = userId,
            UserName = string.IsNullOrWhiteSpace(userName) ? "—" : userName,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            IpAddress = ipAddress,
            Details = details
        });

        await db.SaveChangesAsync();
    }
}
