using System.Security.Cryptography;
using System.Text;

namespace MHD.Api.Security;

/// <summary>
/// التحقق من توقيع رسائل خادم الاستقبال: HMAC-SHA256 على "الطابع الزمني.المحتوى" بسر مشترك،
/// مع رفض أي رسالة يتجاوز فرق توقيتها خمس دقائق (يمنع إعادة استخدام رسالة ملتقطة).
/// </summary>
public static class IntakeSignature
{
    public static readonly TimeSpan MaxSkew = TimeSpan.FromMinutes(5);

    public static bool IsValid(byte[] secret, string? timestamp, string? signature, string body, DateTimeOffset now)
    {
        if (secret.Length < 32 || string.IsNullOrEmpty(timestamp) || string.IsNullOrEmpty(signature)) return false;
        if (!long.TryParse(timestamp, out var ts)) return false;
        if ((now - DateTimeOffset.FromUnixTimeSeconds(ts)).Duration() > MaxSkew) return false;

        byte[] provided;
        try
        {
            provided = Convert.FromBase64String(signature);
        }
        catch (FormatException)
        {
            return false;
        }

        var expected = HMACSHA256.HashData(secret, Encoding.UTF8.GetBytes($"{timestamp}.{body}"));
        return CryptographicOperations.FixedTimeEquals(expected, provided);
    }
}
