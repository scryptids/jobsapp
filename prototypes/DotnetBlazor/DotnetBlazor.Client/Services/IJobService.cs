using DotnetBlazor.Client.Models;

namespace DotnetBlazor.Client.Services;

public interface IJobService
{
    Task<IEnumerable<JobDto>> GetJobsAsync();
}
