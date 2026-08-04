using System.Security.Cryptography;
using System.Text;

namespace MHD.Api.Security;

/// <summary>TOTP قياسي (RFC 6238): SHA1، 6 خانات، خطوة 30 ثانية — متوافق مع Google/Microsoft Authenticator.</summary>
public static class TotpService
{
    private const int Step = 30;
    private const int Digits = 6;
    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public static string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(20);
        return Base32Encode(bytes);
    }

    public static string BuildProvisioningUri(string secret, string email, string issuer = "MHD Legal")
    {
        return $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}" +
               $"?secret={secret}&issuer={Uri.EscapeDataString(issuer)}&algorithm=SHA1&digits={Digits}&period={Step}";
    }

    /// <summary>يتحقق من الرمز مع نافذة تسامح ±30 ثانية لفروق ساعة الجهاز.</summary>
    public static bool Validate(string secret, string code, int window = 1)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != Digits || !code.All(char.IsDigit))
            return false;

        var secretBytes = Base32Decode(secret);
        var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / Step;

        for (var i = -window; i <= window; i++)
        {
            if (ComputeCode(secretBytes, currentStep + i) == code)
                return true;
        }

        return false;
    }

    private static string ComputeCode(byte[] secret, long counter)
    {
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian) Array.Reverse(counterBytes);

        using var hmac = new HMACSHA1(secret);
        var hash = hmac.ComputeHash(counterBytes);

        var offset = hash[^1] & 0x0F;
        var binaryCode = ((hash[offset] & 0x7F) << 24)
            | ((hash[offset + 1] & 0xFF) << 16)
            | ((hash[offset + 2] & 0xFF) << 8)
            | (hash[offset + 3] & 0xFF);

        var code = binaryCode % (int)Math.Pow(10, Digits);
        return code.ToString().PadLeft(Digits, '0');
    }

    private static string Base32Encode(byte[] data)
    {
        var sb = new StringBuilder();
        int bits = 0, value = 0;

        foreach (var b in data)
        {
            value = (value << 8) | b;
            bits += 8;
            while (bits >= 5)
            {
                sb.Append(Base32Alphabet[(value >> (bits - 5)) & 31]);
                bits -= 5;
            }
        }

        if (bits > 0)
            sb.Append(Base32Alphabet[(value << (5 - bits)) & 31]);

        return sb.ToString();
    }

    private static byte[] Base32Decode(string input)
    {
        input = input.TrimEnd('=').ToUpperInvariant();
        var bytes = new List<byte>();
        int bits = 0, value = 0;

        foreach (var c in input)
        {
            var idx = Base32Alphabet.IndexOf(c);
            if (idx < 0) continue;

            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8)
            {
                bytes.Add((byte)((value >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }

        return bytes.ToArray();
    }
}
