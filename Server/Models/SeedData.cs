using BlazorAppWasmLab.Shared;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace BlazorAppWasmLab.Server.Models;

public static class SeedData
{
    public static void Init(ModelBuilder modelBuilder)
    {
        var httpClient = new HttpClient();
        var response = httpClient.GetStringAsync("https://paramquery.com/Content/olympicWinners.json?pq_datatype=JSON")
            .GetAwaiter()
            .GetResult();
        var data = (JsonConvert.DeserializeObject<IEnumerable<OlympicWinner>>(response,
                new JsonSerializerSettings() {DateFormatString = "dd/MM/yyyy"}) ?? Enumerable.Empty<OlympicWinner>())
            .ToList();
        var id = 0;
        foreach (var item in data)
        {
            item.Id = ++id;
        }

        modelBuilder.Entity<OlympicWinner>().HasData(data);
    }
}