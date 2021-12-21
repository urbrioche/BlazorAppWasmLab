using BlazorAppWasmLab.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlazorAppWasmLab.Server.Models;

public class MyNoteDbContext : DbContext
{
    public MyNoteDbContext(DbContextOptions options) : base(options)
    {
    }

    public DbSet<MyNote> MyNotes { get; set; }
}