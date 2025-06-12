namespace DotnetBlazor.Data;

public class Job
{
    public int JobId { get; set; }
    public required string Title { get; set; }
    public required string PostingUrl { get; set; }
    public decimal PayRangeLower { get; set; }
    public decimal PayRangeUpper { get; set; }

    public int EmployerId { get; set; } // Required foreign key property
    public Employer Employer { get; set; } = null!; // Required reference navigation to principal

    public required string ApplicationUserId { get; set; } // Required foreign key property
    public ApplicationUser ApplicationUser { get; set; } = null!; // Required reference navigation to principal
}
