using System.Security.Cryptography;

namespace MHD.Api.Security;

/// <summary>
/// تخزين المستندات مشفَّرة (AES-256-GCM) على القرص المحلي. قائمة الامتدادات المسموحة صريحة
/// (Allowlist لا Blocklist) لرفض أي ملف تنفيذي أو غير متوقع، وحد الحجم 50 ميجابايت.
/// </summary>
public class DocumentStorage
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".jpg", ".jpeg", ".png", ".txt", ".rtf"
    };

    private const long MaxSizeBytes = 50 * 1024 * 1024;

    private readonly string _rootPath;
    private readonly EncryptionService _encryption;

    public DocumentStorage(IConfiguration config, EncryptionService encryption)
    {
        _rootPath = config["Storage:RootPath"] ?? "./storage/documents";
        Directory.CreateDirectory(_rootPath);
        _encryption = encryption;
    }

    public static bool IsExtensionAllowed(string fileName) => AllowedExtensions.Contains(Path.GetExtension(fileName));

    public static bool ExceedsMaxSize(long size) => size > MaxSizeBytes;

    public async Task<(string StoragePath, string Sha256)> SaveAsync(Guid documentId, byte[] content)
    {
        var sha256 = Convert.ToHexString(SHA256.HashData(content));
        var encrypted = _encryption.EncryptBytes(content);
        var relativePath = $"{documentId}.bin";
        await File.WriteAllBytesAsync(Path.Combine(_rootPath, relativePath), encrypted);
        return (relativePath, sha256);
    }

    public async Task<byte[]> LoadAsync(string storagePath)
    {
        var encrypted = await File.ReadAllBytesAsync(Path.Combine(_rootPath, storagePath));
        return _encryption.DecryptBytes(encrypted);
    }

    public void Delete(string storagePath)
    {
        var fullPath = Path.Combine(_rootPath, storagePath);
        if (File.Exists(fullPath)) File.Delete(fullPath);
    }
}
