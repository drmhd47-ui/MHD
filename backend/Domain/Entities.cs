namespace MHD.Api.Domain;

public enum UserRole
{
    Manager = 1,
    Lawyer = 2
}

public enum ClientType
{
    Individual = 1,
    Company = 2
}

public enum CaseStatus
{
    Open = 1,
    Closed = 2,
    Archived = 3
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public UserRole Role { get; set; }

    public string PasswordHash { get; set; } = default!;
    public string PasswordSalt { get; set; } = default!;
    public bool MustChangePassword { get; set; } = true;

    public string? TotpSecretEncrypted { get; set; }
    public bool TotpEnabled { get; set; }

    public bool IsActive { get; set; } = true;
    public int FailedLoginAttempts { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public string TokenHash { get; set; } = default!;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string CreatedByIp { get; set; } = default!;

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;
}

/// <summary>سجل تدقيق للإضافة فقط — يُمنع التعديل والحذف على مستوى AppDbContext.</summary>
public class AuditLogEntry
{
    public long Id { get; set; }
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = default!;
    public string Action { get; set; } = default!;
    public string EntityType { get; set; } = default!;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string IpAddress { get; set; } = default!;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public class Client
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public ClientType Type { get; set; }
    public string FullName { get; set; } = default!;
    public string? NationalIdOrCr { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public bool IsArchived { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid CreatedByUserId { get; set; }

    public ICollection<Case> Cases { get; set; } = new List<Case>();
}

public class Case
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CaseNumber { get; set; } = default!;
    public string Title { get; set; } = default!;

    public Guid ClientId { get; set; }
    public Client Client { get; set; } = default!;

    /// <summary>اسم الطرف المقابل — يُستخدم أيضاً في فحص تعارض المصالح لعملاء جدد.</summary>
    public string? OpposingPartyName { get; set; }
    public string? CaseType { get; set; }
    public string? Court { get; set; }
    public CaseStatus Status { get; set; } = CaseStatus.Open;

    public DateOnly OpenedDate { get; set; }
    public DateOnly? ClosedDate { get; set; }

    public Guid AssignedLawyerId { get; set; }
    public User AssignedLawyer { get; set; } = default!;

    public string? Description { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid CreatedByUserId { get; set; }
}
