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

/// <summary>مستند مرفق بملف قضية — مُخزَّن مشفَّراً على القرص (AES-256-GCM)، ببصمة SHA-256 تكشف أي عبث.</summary>
public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = default!;

    public string FileName { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public long SizeBytes { get; set; }
    public string Sha256Fingerprint { get; set; } = default!;

    /// <summary>مسار الملف المشفَّر نسبةً إلى Storage:RootPath — وليس مساراً مطلقاً على القرص.</summary>
    public string StoragePath { get; set; } = default!;

    public bool IsArchived { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid UploadedByUserId { get; set; }
}

public enum AppointmentType
{
    Hearing = 1,
    Meeting = 2,
    Deadline = 3,
    Other = 4
}

public class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = default!;
    public AppointmentType Type { get; set; } = AppointmentType.Other;

    public Guid? CaseId { get; set; }
    public Case? Case { get; set; }

    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset? EndAt { get; set; }
    public string? Location { get; set; }
    public string? Notes { get; set; }

    /// <summary>عدد الدقائق قبل الموعد لإرسال تذكير — الحقل مسجَّل، الإرسال الفعلي لم يُبنَ بعد.</summary>
    public int? ReminderMinutesBefore { get; set; }

    public Guid AssignedUserId { get; set; }
    public User AssignedUser { get; set; } = default!;

    public bool IsCancelled { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid CreatedByUserId { get; set; }
}

public enum LegalReferenceType
{
    Law = 1,
    Regulation = 2,
    Decision = 3,
    Circular = 4,
    Other = 5
}

/// <summary>الأرشيف القانوني للأنظمة واللوائح والقرارات — مرجع بحث داخلي، لا يرتبط بقضية بعينها.</summary>
public class LegalReference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = default!;
    public LegalReferenceType Type { get; set; }
    public string? IssuingAuthority { get; set; }
    public DateOnly? IssueDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Summary { get; set; }
    public string? SourceUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid CreatedByUserId { get; set; }
}

public class TimeEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CaseId { get; set; }
    public Case Case { get; set; } = default!;

    public Guid LawyerId { get; set; }
    public User Lawyer { get; set; } = default!;

    public DateOnly WorkDate { get; set; }
    public decimal Hours { get; set; }
    public string Description { get; set; } = default!;
    public bool IsBilled { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum InvoiceStatus
{
    Draft = 1,
    Issued = 2,
    Paid = 3,
    Cancelled = 4
}

/// <summary>
/// فاتورة — حكر على المدير. لا حذف فعلي لها عمداً: فقط Draft قابلة للتعديل، وما إن تُصدَر (Issued)
/// تتجمّد أرقامها نهائياً؛ الإلغاء بعد الإصدار يُسجَّل كحالة لا كحذف.
/// </summary>
public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>لا يُعيَّن إلا عند الإصدار (Issue) — الفاتورة قبل ذلك مسودة بلا رقم نظامي.</summary>
    public string? InvoiceNumber { get; set; }

    public Guid ClientId { get; set; }
    public Client Client { get; set; } = default!;

    public Guid? CaseId { get; set; }
    public Case? Case { get; set; }

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public DateOnly IssueDate { get; set; }

    public decimal Subtotal { get; set; }
    public decimal VatRate { get; set; } = 0.15m;
    public decimal VatAmount { get; set; }
    public decimal Total { get; set; }

    /// <summary>اسم البائع والرقم الضريبي وقت الإصدار — يُنسَخان من إعدادات المكتب لتثبيت الفاتورة تاريخياً.</summary>
    public string? SellerName { get; set; }
    public string? SellerVatNumber { get; set; }

    /// <summary>حمولة TLV بصيغة ZATCA مُرمَّزة base64 — تُبنى فقط عند الإصدار.</summary>
    public string? QrCodeTlvBase64 { get; set; }

    public DateTimeOffset? PaidAt { get; set; }
    public decimal? PaidAmount { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid CreatedByUserId { get; set; }

    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}

public class InvoiceLine
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = default!;

    public string Description { get; set; } = default!;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

/// <summary>إعدادات المكتب — صف واحد فقط، حكر على المدير، يُستخدم في بناء الفواتير.</summary>
public class OfficeSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FirmName { get; set; } = "مجموعة إم القانونية";
    public string? VatNumber { get; set; }
    public string? CommercialRegistrationNumber { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal DefaultVatRate { get; set; } = 0.15m;

    /// <summary>المحامي المناوب الذي يُشعَر بطلبات الموقع الواردة. إن لم يُحدَّد يُشعَر المديرون.</summary>
    public Guid? OnDutyUserId { get; set; }

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public enum IntakeRequestStatus
{
    New = 1,
    InReview = 2,
    Converted = 3,
    Declined = 4
}

public enum PreferredContact
{
    Phone = 1,
    Email = 2
}

/// <summary>
/// طلب استشارة وارد من الموقع العام عبر خادم الاستقبال. ليس عميلاً بعد: يراجعه محامٍ، ويمر بفحص
/// تعارض المصالح، ثم يُحوَّل إلى عميل أو يُعتذر عنه. المعرّف يأتي من خادم الاستقبال فيمنع التكرار عند إعادة الإرسال.
/// الطلبات المعتذر عنها تُجهَّل بياناتها الشخصية بعد مدة الاحتفاظ (IntakeRetentionService).
/// </summary>
public class IntakeRequest
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = default!;
    public DateTimeOffset SubmittedAt { get; set; }
    public DateTimeOffset ReceivedAt { get; set; } = DateTimeOffset.UtcNow;
    public string Language { get; set; } = "ar";

    public string FullName { get; set; } = default!;
    public PreferredContact PreferredContact { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? ServiceSlug { get; set; }
    public string? ServiceTitle { get; set; }
    /// <summary>اسم الطرف الآخر كما كتبه مقدم الطلب — لفحص تعارض المصالح فقط.</summary>
    public string? OpposingPartyName { get; set; }

    public DateTimeOffset ConsentAt { get; set; }
    public string PrivacyPolicyVersion { get; set; } = default!;

    public IntakeRequestStatus Status { get; set; } = IntakeRequestStatus.New;
    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }
    public Guid? ConvertedClientId { get; set; }
    public string? DeclineReason { get; set; }
    /// <summary>مبرر المحامي عند التحويل رغم وجود تطابق في فحص التعارض — يُحفظ ويُسجَّل في سجل التدقيق.</summary>
    public string? ConflictAcknowledgement { get; set; }
    public Guid? ClosedByUserId { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? AnonymizedAt { get; set; }
}
