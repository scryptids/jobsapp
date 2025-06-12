namespace DotnetBlazor.Data;

public class Employer
{
    public int EmployerId { get; set; }
    public required string Name { get; set; }
    public ICollection<Job> Jobs { get; } = [];

    public required string ApplicationUserId { get; set; } // Required foreign key property
    public ApplicationUser ApplicationUser { get; set; } = null!; // Required reference navigation to principal
}
