using Microsoft.AspNetCore.Identity;

namespace DotnetBlazor.Data;

// Add profile data for application users by adding properties to the ApplicationUser class
public class ApplicationUser : IdentityUser
{
    public ICollection<Employer> Employers { get; } = [];
    public ICollection<Job> Jobs { get; } = [];
}

