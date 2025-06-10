# Job application tracker using ASP.NET 9.0 Blazor

This application was scaffolded using the [MudBlazor template](https://github.com/MudBlazor/Templates) by installing the template and running the command `dotnet new mudblazor --interactivity Auto --auth Individual --all-interactive`. That command created a [Blazor Web App](https://learn.microsoft.com/en-us/aspnet/core/blazor/project-structure?view=aspnetcore-9.0#blazor-web-app) solution with support for the **Interactive Auto** [render mode](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/render-modes?view=aspnetcore-9.0) with global interactivity enabled.

Blazor Web App is a full-stack pattern for writing web applications using ASP.NET technologies for both client-side and server-side code.

Be careful not to be confused by guidance tailored to particular [Blazor hosting models](https://learn.microsoft.com/en-us/aspnet/core/blazor/hosting-models?view=aspnetcore-9.0). The linked article notes:

> Blazor Web Apps in .NET 8 or later are better conceptualized by how Razor components are rendered, which is described as their render mode.

Using the **Interactive Auto** render mode enables superior performance and user experience (UX), but having code potentially run on the server and then later on the client may be a point of confusion.

## Notes

### Implementing web APIs

https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis?view=aspnetcore-9.0

### Calling web APIs

https://learn.microsoft.com/en-us/aspnet/core/blazor/call-web-api?view=aspnetcore-9.0

#### External web APIs

"Client-based components call external web APIs using [HttpClient](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient) instances, typically created with a pre-configured [HttpClient](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient) registered in the Program file"

"Server-based components call external web APIs using [HttpClient](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient?view=net-9.0) instances, typically created using [IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.ihttpclientfactory?view=net-9.0-pp). For guidance that applies to server-side apps, see [Make HTTP requests using IHttpClientFactory in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests?view=aspnetcore-9.0)."

#### Internal web APIs

[HttpClient](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient)  is also used for calling internal web APIs, see [ClientWeatherService.cs](https://github.com/dotnet/blazor-samples/blob/main/9.0/BlazorWebAppCallWebApi_Weather/BlazorApp.Client/Services/ClientWeatherService.cs) in the BlazorWebAppCallWebApi_Weather example of the official [blazor-samples repository](https://github.com/dotnet/blazor-samples).

## Prerequisites

The [.NET SDK](https://dotnet.microsoft.com/en-us/download) will need to be installed in order to build and develop this project locally.

Installing the .NET SDK also installs the `dotnet` command-line tool, which can be used to run code, manage dependencies, and more.

```shell
# installing dependencies tracked in a .csproj file
dotnet restore

# adding dependencies
dotnet package add Microsoft.EntityFrameworkCore

# run project
dotnet DotnetBlazor/DotnetBlazor/DotnetBlazor.csproj
```

You will also need a text editor or integrated development environment (IDE) for editing and debugging the application source. [Visual Studio Code](https://code.visualstudio.com/) (VSCode) is available on all platforms, and can be used in conjunction with the .NET SDK and the official [C# Dev Kit for VS Code](https://marketplace.visualstudio.com/items?itemName=ms-dotnettools.csdevkit).

Developers with Windows workstations also have the option of using [Visual Studio](https://visualstudio.microsoft.com/vs/features/net-development/) for developing .NET applications. Visual Studio came long before VS Code and includes more features for developing, debugging, and profiling applications.

If you are running into issues getting this application running locally, try following the official [Blazor setup tutorial](https://dotnet.microsoft.com/en-us/learn/aspnet/blazor-tutorial/intro) for a more minimal example.

## Running the local development server

### VS Code

The development server can be launched alongside Microsoft Edge using a `launch.json` profile like the following.

```json
{
    "name": "C#: DotnetBlazor [Default Configuration]",
    "type": "dotnet",
    "request": "launch",
    "projectPath": "${workspaceFolder}/prototypes/DotnetBlazor/DotnetBlazor/DotnetBlazor.csproj"
}
```

### Command line

Alternatively, the local development server can be started in a terminal using the `dotnet run DotnetBlazor/DotnetBlazor.csproj` command. See the [documentation for the dotnet run subcommand](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-run) for more information.

## Data

This application is currently configured to use [SQLite](https://www.sqlite.org/) as a database, with [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/) (EF) as an Object-Relational Mapper (ORM).

For agility, Entity Framework models can initially be [used directly in views](https://github.com/dotnet/blazor-samples/blob/main/9.0/BlazorWebAppMovies/Components/Pages/MoviePages/Index.razor), then later abstracted away using patterns like [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs).

See the following links for more information on data access design patterns and supporting packages.

https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/

https://alistair.cockburn.us/hexagonal-architecture

https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html

https://github.com/ardalis/CleanArchitecture

https://github.com/jbogard/MediatR

https://github.com/AutoMapper/AutoMapper

### Tools for SQLite

The `Microsoft.EntityFrameworkCore.Sqlite` dependency of the `DotnetBlazor` project enables operations against SQLite. A native binary for interacting with SQLite databases on the command line can either be manually downloaded from the [SQLite downloads page](https://www.sqlite.org/download.html) or installed via a package manager.

```shell
# MacOS + Homebrew
brew install sqlite # https://formulae.brew.sh/formula/sqlite
```

#### Additional resources

https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/?tabs=net-cli

### Entity Framework

https://learn.microsoft.com/en-us/ef/core/cli/

The Entity Framework command-line tools must be installed manually in order to use anything under the `dotnet ef` subcommand.

```shell
dotnet tool install --global dotnet-ef
# you may also need to add ~/.dotnet/tools to your PATH variable
```

There is also a supporting package `Microsoft.EntityFrameworkCore.Design` that is installed in the `DotnetBlazor` project - though it is not clear if it is necessary for any typical development use cases.

#### Migrations

https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/?tabs=dotnet-core-cli

The EF command line tools can be used to create and apply migrations. Assuming new `Employer` and `Job` models have just been written, a migration might be created and applied as follows. Commands should be run in the same directory as the `DotnetBlazor.csproj` file.

```shell
dotnet ef migrations add CreateEmployerAndJobsSchema
dotnet ef database update
```
