using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DotnetBlazor.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Job> Jobs { get; set; }
    public DbSet<Job> Employers { get; set; }

    #region Required
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>()
            .HasMany(e => e.Employers)
            .WithOne(e => e.ApplicationUser)
            .HasForeignKey(e => e.ApplicationUserId)
            .IsRequired();

        modelBuilder.Entity<ApplicationUser>()
            .HasMany(e => e.Jobs)
            .WithOne(e => e.ApplicationUser)
            .HasForeignKey(e => e.ApplicationUserId)
            .IsRequired();

        modelBuilder.Entity<Employer>()
            .HasMany(e => e.Jobs)
            .WithOne(e => e.Employer)
            .HasForeignKey(e => e.EmployerId)
            .IsRequired();
    }
    #endregion
}
