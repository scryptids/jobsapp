using DotnetBlazor.Client.Models;

namespace DotnetBlazor.Client.Services;

public interface IEmployerService
{
    Task<IEnumerable<EmployerDto>> GetEmployersAsync();
}
