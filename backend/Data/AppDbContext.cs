using Microsoft.EntityFrameworkCore;
using MHD.Api.Domain;

namespace MHD.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLogEntry> AuditLogs => Set<AuditLogEntry>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<LegalReference> LegalReferences => Set<LegalReference>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<OfficeSettings> OfficeSettings => Set<OfficeSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.Property(u => u.FullName).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(r => r.TokenHash).IsUnique();
            e.Property(r => r.TokenHash).HasMaxLength(128).IsRequired();
            e.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLogEntry>(e =>
        {
            e.HasIndex(a => a.Timestamp);
            e.Property(a => a.Action).HasMaxLength(100).IsRequired();
            e.Property(a => a.EntityType).HasMaxLength(100).IsRequired();
            e.Property(a => a.UserName).HasMaxLength(200).IsRequired();
            e.Property(a => a.IpAddress).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<Client>(e =>
        {
            e.Property(c => c.FullName).HasMaxLength(300).IsRequired();
            e.HasIndex(c => c.FullName);
            e.HasIndex(c => c.NationalIdOrCr);
        });

        modelBuilder.Entity<Case>(e =>
        {
            e.HasIndex(c => c.CaseNumber).IsUnique();
            e.Property(c => c.CaseNumber).HasMaxLength(50).IsRequired();
            e.Property(c => c.Title).HasMaxLength(300).IsRequired();
            e.HasIndex(c => c.OpposingPartyName);

            e.HasOne(c => c.Client)
                .WithMany(cl => cl.Cases)
                .HasForeignKey(c => c.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(c => c.AssignedLawyer)
                .WithMany()
                .HasForeignKey(c => c.AssignedLawyerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.Property(d => d.FileName).HasMaxLength(300).IsRequired();
            e.Property(d => d.ContentType).HasMaxLength(150).IsRequired();
            e.Property(d => d.Sha256Fingerprint).HasMaxLength(64).IsRequired();
            e.Property(d => d.StoragePath).HasMaxLength(300).IsRequired();
            e.HasIndex(d => d.CaseId);

            e.HasOne(d => d.Case)
                .WithMany()
                .HasForeignKey(d => d.CaseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Appointment>(e =>
        {
            e.Property(a => a.Title).HasMaxLength(300).IsRequired();
            e.HasIndex(a => a.StartAt);
            e.HasIndex(a => a.CaseId);

            e.HasOne(a => a.Case)
                .WithMany()
                .HasForeignKey(a => a.CaseId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.AssignedUser)
                .WithMany()
                .HasForeignKey(a => a.AssignedUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LegalReference>(e =>
        {
            e.Property(l => l.Title).HasMaxLength(400).IsRequired();
            e.HasIndex(l => l.Title);
            e.HasIndex(l => l.Type);
        });

        modelBuilder.Entity<TimeEntry>(e =>
        {
            e.Property(t => t.Description).HasMaxLength(1000).IsRequired();
            e.Property(t => t.Hours).HasColumnType("decimal(6,2)");
            e.HasIndex(t => t.CaseId);
            e.HasIndex(t => t.LawyerId);

            e.HasOne(t => t.Case)
                .WithMany()
                .HasForeignKey(t => t.CaseId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Lawyer)
                .WithMany()
                .HasForeignKey(t => t.LawyerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.InvoiceNumber).IsUnique().HasFilter("[InvoiceNumber] IS NOT NULL");
            e.Property(i => i.InvoiceNumber).HasMaxLength(50);
            e.Property(i => i.Subtotal).HasColumnType("decimal(12,2)");
            e.Property(i => i.VatRate).HasColumnType("decimal(5,4)");
            e.Property(i => i.VatAmount).HasColumnType("decimal(12,2)");
            e.Property(i => i.Total).HasColumnType("decimal(12,2)");
            e.Property(i => i.PaidAmount).HasColumnType("decimal(12,2)");
            e.Property(i => i.SellerName).HasMaxLength(300);
            e.Property(i => i.SellerVatNumber).HasMaxLength(50);

            e.HasOne(i => i.Client)
                .WithMany()
                .HasForeignKey(i => i.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Case)
                .WithMany()
                .HasForeignKey(i => i.CaseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvoiceLine>(e =>
        {
            e.Property(l => l.Description).HasMaxLength(500).IsRequired();
            e.Property(l => l.Quantity).HasColumnType("decimal(10,2)");
            e.Property(l => l.UnitPrice).HasColumnType("decimal(12,2)");
            e.Property(l => l.LineTotal).HasColumnType("decimal(12,2)");

            e.HasOne(l => l.Invoice)
                .WithMany(i => i.Lines)
                .HasForeignKey(l => l.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OfficeSettings>(e =>
        {
            e.Property(o => o.FirmName).HasMaxLength(300).IsRequired();
            e.Property(o => o.DefaultVatRate).HasColumnType("decimal(5,4)");
        });
    }

    public override int SaveChanges()
    {
        BlockAuditLogTampering();
        BlockInvoiceTampering();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        BlockAuditLogTampering();
        BlockInvoiceTampering();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>سجل التدقيق للإضافة فقط — يُرفض أي تعديل أو حذف في الكود نفسه بصرف النظر عن مصدر الطلب.</summary>
    private void BlockAuditLogTampering()
    {
        var illegal = ChangeTracker.Entries<AuditLogEntry>()
            .Any(e => e.State is EntityState.Modified or EntityState.Deleted);

        if (illegal)
            throw new InvalidOperationException("سجل التدقيق للإضافة فقط: لا يمكن تعديله أو حذفه.");
    }

    private static readonly string[] FrozenInvoiceFields =
    [
        nameof(Invoice.InvoiceNumber), nameof(Invoice.Subtotal), nameof(Invoice.VatRate),
        nameof(Invoice.VatAmount), nameof(Invoice.Total), nameof(Invoice.SellerName),
        nameof(Invoice.SellerVatNumber), nameof(Invoice.QrCodeTlvBase64), nameof(Invoice.ClientId),
        nameof(Invoice.CaseId), nameof(Invoice.IssueDate)
    ];

    /// <summary>لا حذف فعلي للفواتير أبداً، ولا تعديل لبياناتها المالية بعد تجاوزها حالة المسودة.</summary>
    private void BlockInvoiceTampering()
    {
        foreach (var entry in ChangeTracker.Entries<Invoice>())
        {
            if (entry.State == EntityState.Deleted)
                throw new InvalidOperationException("لا يمكن حذف الفواتير نهائياً — استخدم الإلغاء بدلاً من ذلك.");

            if (entry.State != EntityState.Modified) continue;

            var originalStatus = (InvoiceStatus)entry.OriginalValues[nameof(Invoice.Status)]!;
            if (originalStatus == InvoiceStatus.Draft) continue;

            if (FrozenInvoiceFields.Any(field => entry.Property(field).IsModified))
                throw new InvalidOperationException("الفاتورة المُصدَرة غير قابلة للتعديل في بياناتها المالية.");
        }
    }
}
