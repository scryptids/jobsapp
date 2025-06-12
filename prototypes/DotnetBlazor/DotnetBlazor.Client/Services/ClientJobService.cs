using System.Net.Http.Json;
using DotnetBlazor.Client.Models;

namespace DotnetBlazor.Client.Services;

public class ClientJobService : IJobService
{
    private readonly HttpClient _httpClient;

    public ClientJobService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IEnumerable<JobDto>> GetJobsAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<IEnumerable<JobDto>>("/api/jobs");
        return result ?? [];
    }
}
