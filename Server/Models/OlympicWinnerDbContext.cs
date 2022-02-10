using BlazorAppWasmLab.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlazorAppWasmLab.Server.Models;

public class OlympicWinnerDbContext : DbContext
{
    public OlympicWinnerDbContext(DbContextOptions<OlympicWinnerDbContext> options)
        : base(options)
    {
    }

    public DbSet<OlympicWinner> OlympicWinners { get; set; } = null!;
}