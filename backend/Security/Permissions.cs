using MHD.Api.Domain;

namespace MHD.Api.Security;

/// <summary>
/// مصفوفة الصلاحيات: المحامي يملك كل وظائف العمل (عملاء، قضايا، مستندات، مواعيد...)،
/// وتبقى ثلاث أدوات سيطرة على النظام نفسه حكراً على المدير: إدارة المستخدمين، سجل التدقيق، والحذف النهائي.
/// هذا الملف هو نقطة التعديل الوحيدة إن أُريد منح المحامين أياً من الثلاثة لاحقاً.
/// الإنفاذ الفعلي يتم في كل Endpoint عبر RequireAuthorization("ManagerOnly") — هذا الملف مرجع للقرار فقط.
/// </summary>
public static class Permissions
{
    public static bool CanManageUsers(UserRole role) => role == UserRole.Manager;
    public static bool CanViewAuditLog(UserRole role) => role == UserRole.Manager;
    public static bool CanPermanentlyDelete(UserRole role) => role == UserRole.Manager;
    public static bool CanManageBilling(UserRole role) => role == UserRole.Manager;
    public static bool CanManageOfficeSettings(UserRole role) => role == UserRole.Manager;
}
