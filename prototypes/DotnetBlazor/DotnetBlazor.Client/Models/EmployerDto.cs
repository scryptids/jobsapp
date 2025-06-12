using DotnetBlazor.Client.Models;

public class EmployerDto
{
    public int EmployerId { get; set; }
    public required string Name { get; set; }
    public ICollection<JobDto> Jobs { get; } = [];
}
