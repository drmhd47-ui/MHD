using System.Net;
using System.Net.Mail;

namespace MHD.Api.Services;

/// <summary>
/// إشعارات البريد الداخلية. لا تحمل أي بيانات شخصية لمقدم الطلب — رقم الطلب فقط، والتفاصيل داخل النظام.
/// إن لم يُعَد SMTP يُكتفى بالسجل، ويظهر الطلب في عدّاد "طلبات الموقع" داخل النظام.
/// </summary>
public class Notifier(IConfiguration config, ILogger<Notifier> logger)
{
    private readonly string? host = config["Smtp:Host"];

    public bool IsConfigured => !string.IsNullOrWhiteSpace(host);

    public async Task SendAsync(IEnumerable<string> recipients, string subject, string body)
    {
        var to = recipients.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();
        if (!IsConfigured || to.Count == 0)
        {
            logger.LogInformation("إشعار داخلي (بلا بريد مُعد): {Subject}", subject);
            return;
        }

        using var client = new SmtpClient(host, int.TryParse(config["Smtp:Port"], out var p) ? p : 587)
        {
            EnableSsl = config["Smtp:EnableSsl"] != "false",
            Timeout = 15000
        };
        if (!string.IsNullOrWhiteSpace(config["Smtp:User"]))
            client.Credentials = new NetworkCredential(config["Smtp:User"], config["Smtp:Password"]);

        using var message = new MailMessage { From = new MailAddress(config["Smtp:From"] ?? "no-reply@mgrp.sa"), Subject = subject, Body = body };
        foreach (var r in to) message.To.Add(r);

        try
        {
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "تعذّر إرسال الإشعار الداخلي: {Subject}", subject);
        }
    }
}
