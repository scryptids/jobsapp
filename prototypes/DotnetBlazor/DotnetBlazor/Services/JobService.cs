using DotnetBlazor.Client.Models;
using DotnetBlazor.Client.Services;
using DotnetBlazor.Data;
using Microsoft.EntityFrameworkCore;

namespace DotnetBlazor.Services.JobService;

public class JobService : IJobService
{
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;

    public JobService(IDbContextFactory<ApplicationDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public async Task<IEnumerable<JobDto>> GetJobsAsync()
    {
        using var context = _contextFactory.CreateDbContext();
        var result = await context.Jobs.ToListAsync();
        if (result == null)
        {
            return [];
        }
        else
        {
            var mappedResults = result.Select((job) => new JobDto(job.Title, job.PostingUrl, job.PayRangeLower, job.PayRangeUpper));
            return mappedResults;
        }
    }
}
