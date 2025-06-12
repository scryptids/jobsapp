using DotnetBlazor.Client.Services;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

builder.Services.AddMudServices();

builder.Services.AddAuthorizationCore();
builder.Services.AddCascadingAuthenticationState();
builder.Services.AddAuthenticationStateDeserialization();

// Pre-configure a HttpClient for web API calls in the client-side services
builder.Services.AddSingleton(new HttpClient
{
    BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)
});

// Register/inject our services as singletons
// This is fine because these services are client-side and stateless
builder.Services.AddSingleton<IEmployerService, ClientEmployerService>();
builder.Services.AddSingleton<IJobService, ClientJobService>();

await builder.Build().RunAsync();
