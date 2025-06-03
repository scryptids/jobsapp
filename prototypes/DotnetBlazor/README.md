# Job application tracker using .NET Blazor

This application was scaffolded using the [MudBlazor template](https://github.com/MudBlazor/Templates).

## Database / Entity Framework (EF)

This application is currently configured to use Sqlite as a database, with Entity Framework as an Object-Relational Mapper (ORM).

### Command-line tools

#### Sqlite

```shell
# MacOS + Homebrew
brew install sqlite # https://formulae.brew.sh/formula/sqlite
```

Official downloads

https://www.sqlite.org/download.html

#### Entity Framework

https://learn.microsoft.com/en-us/ef/core/cli/

```shell
dotnet tool install --global dotnet-ef
# you may also need to add ~/.dotnet/tools to your PATH
```

There is also a supporting package `Microsoft.EntityFrameworkCore.Design` that is installed in the DotnetBlazor project - though it is unsure if this is necessary.

### Migrations

https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/?tabs=dotnet-core-cli

```shell
# in DotnetBlazor/DotnetBlazor directory
dotnet ef migrations
```
