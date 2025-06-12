using System.Net.Http.Json;
using DotnetBlazor.Client.Models;

namespace DotnetBlazor.Client.Services;

public class ClientEmployerService : IEmployerService
{
    private readonly HttpClient _httpClient;

    public ClientEmployerService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IEnumerable<EmployerDto>> GetEmployersAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<IEnumerable<EmployerDto>>("/api/employers");
        return result ?? [];
    }
}
