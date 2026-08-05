using System.Security.Cryptography;
using System.Text;

namespace MHD.Api.Security;

/// <summary>
/// تشفير حقول حساسة (سر TOTP) ومستندات كاملة بـ AES-256-GCM. المفتاح من الإعداد
/// Security:FieldEncryptionKey (32 بايت base64) — وهو نفسه STORAGE_KEY في بيئة الإنتاج.
/// </summary>
public class EncryptionService
{
    private readonly byte[] _key;

    public EncryptionService(IConfiguration config)
    {
        var keyBase64 = config["Security:FieldEncryptionKey"]
            ?? throw new InvalidOperationException("Security:FieldEncryptionKey غير مُعرَّف في الإعدادات");

        _key = Convert.FromBase64String(keyBase64);
        if (_key.Length != 32)
            throw new InvalidOperationException("Security:FieldEncryptionKey يجب أن يكون 32 بايت بعد فك base64");
    }

    public string Encrypt(string plaintext) => Convert.ToBase64String(EncryptBytes(Encoding.UTF8.GetBytes(plaintext)));

    public string Decrypt(string payloadBase64) => Encoding.UTF8.GetString(DecryptBytes(Convert.FromBase64String(payloadBase64)));

    public byte[] EncryptBytes(byte[] plaintext)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var cipher = new byte[plaintext.Length];
        var tag = new byte[16];

        using (var aes = new AesGcm(_key, 16))
        {
            aes.Encrypt(nonce, plaintext, cipher, tag);
        }

        var result = new byte[nonce.Length + tag.Length + cipher.Length];
        Buffer.BlockCopy(nonce, 0, result, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, result, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipher, 0, result, nonce.Length + tag.Length, cipher.Length);

        return result;
    }

    public byte[] DecryptBytes(byte[] payload)
    {
        var nonce = payload[..12];
        var tag = payload[12..28];
        var cipher = payload[28..];
        var plain = new byte[cipher.Length];

        using (var aes = new AesGcm(_key, 16))
        {
            aes.Decrypt(nonce, cipher, tag, plain);
        }

        return plain;
    }
}
