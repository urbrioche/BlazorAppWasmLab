using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BlazorAppWasmLab.Server.Migrations
{
    public partial class Initial : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OlympicWinners",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Athlete = table.Column<string>(type: "TEXT", nullable: true),
                    Age = table.Column<int>(type: "INTEGER", nullable: false),
                    Country = table.Column<string>(type: "TEXT", nullable: true),
                    Year = table.Column<int>(type: "INTEGER", nullable: true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Sport = table.Column<string>(type: "TEXT", nullable: true),
                    Gold = table.Column<int>(type: "INTEGER", nullable: false),
                    Silver = table.Column<int>(type: "INTEGER", nullable: false),
                    Bronze = table.Column<int>(type: "INTEGER", nullable: false),
                    Total = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OlympicWinners", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OlympicWinners");
        }
    }
}
