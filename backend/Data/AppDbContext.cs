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
    }

    public override int SaveChanges()
    {
        BlockAuditLogTampering();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        BlockAuditLogTampering();
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
}
