using System.Security.Cryptography;

namespace MHD.Api.Security;

/// <summary>PBKDF2-SHA512 بـ 600,000 دورة وملح فريد لكل مستخدم.</summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 64;
    private const int Iterations = 600_000;

    public static (string Hash, string Salt) Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, KeySize);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    public static bool Verify(string password, string hashBase64, string saltBase64)
    {
        var salt = Convert.FromBase64String(saltBase64);
        var expected = Convert.FromBase64String(hashBase64);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, KeySize);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    /// <summary>12 محرفاً فأكثر، حرف كبير وصغير ورقم ورمز.</summary>
    public static bool MeetsPolicy(string password, out string error)
    {
        if (password.Length < 12)
        {
            error = "كلمة المرور يجب أن تكون 12 محرفاً على الأقل";
            return false;
        }
        if (!password.Any(char.IsUpper))
        {
            error = "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل";
            return false;
        }
        if (!password.Any(char.IsLower))
        {
            error = "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل";
            return false;
        }
        if (!password.Any(char.IsDigit))
        {
            error = "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل";
            return false;
        }
        if (password.All(char.IsLetterOrDigit))
        {
            error = "يجب أن تحتوي كلمة المرور على رمز واحد على الأقل";
            return false;
        }

        error = "";
        return true;
    }
}
