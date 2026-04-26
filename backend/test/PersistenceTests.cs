namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PhaenoPortal.App.Infrastructure.Persistence;

public class PersistenceTests
{
    [Fact]
    public void AppDbContextUsesConfiguredDefaultSchema()
    {
        var dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=phaeno_portal_test;Username=postgres;Password=postgres")
            .Options;

        using var dbContext = new AppDbContext(
            dbContextOptions,
            Options.Create(new PersistenceOptions { Schema = "portal" }));

        Assert.Equal("portal", dbContext.Model.GetDefaultSchema());
    }

    [Fact]
    public void AppDbContextMapsAccountEntities()
    {
        var dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=phaeno_portal_test;Username=postgres;Password=postgres")
            .Options;

        using var dbContext = new AppDbContext(
            dbContextOptions,
            Options.Create(new PersistenceOptions { Schema = "portal" }));

        var organizationEntity = dbContext.Model.FindEntityType(typeof(Organization));
        Assert.NotNull(organizationEntity);
        Assert.Equal("portal", organizationEntity.GetSchema());
        Assert.Equal("Organizations", organizationEntity.GetTableName());
        Assert.Contains(
            organizationEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([nameof(Organization.Name)]));
        var organizationVersionProperty = organizationEntity.FindProperty(nameof(Organization.Version));
        Assert.NotNull(organizationVersionProperty);
        Assert.False(organizationVersionProperty.IsNullable);
        Assert.True(organizationVersionProperty.IsConcurrencyToken);
        var organizationIsActiveProperty = organizationEntity.FindProperty(nameof(Organization.IsActive));
        Assert.NotNull(organizationIsActiveProperty);
        Assert.False(organizationIsActiveProperty.IsNullable);

        var userEntity = dbContext.Model.FindEntityType(typeof(User));
        Assert.NotNull(userEntity);
        Assert.Equal("portal", userEntity.GetSchema());
        Assert.Equal("Users", userEntity.GetTableName());
        Assert.Contains(
            userEntity.GetIndexes(),
            index => index.IsUnique
                && index.Properties.Select(property => property.Name).SequenceEqual([nameof(User.Email)]));
        var userVersionProperty = userEntity.FindProperty(nameof(User.Version));
        Assert.NotNull(userVersionProperty);
        Assert.False(userVersionProperty.IsNullable);
        Assert.True(userVersionProperty.IsConcurrencyToken);

        var organizationForeignKey = Assert.Single(
            userEntity.GetForeignKeys(),
            foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Organization));
        Assert.Equal(DeleteBehavior.Restrict, organizationForeignKey.DeleteBehavior);

        var auditEventEntity = dbContext.Model.FindEntityType(typeof(AuditEvent));
        Assert.NotNull(auditEventEntity);
        Assert.Equal("portal", auditEventEntity.GetSchema());
        Assert.Equal("AuditEvents", auditEventEntity.GetTableName());
        var changesJsonProperty = auditEventEntity.FindProperty(nameof(AuditEvent.ChangesJson));
        Assert.NotNull(changesJsonProperty);
        Assert.Equal("jsonb", changesJsonProperty.GetColumnType());
    }
}
