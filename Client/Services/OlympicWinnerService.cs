using System.Net.Http.Json;
using BlazorAppWasmLab.Client.Interfaces;

namespace BlazorAppWasmLab.Client.Services;

public class OlympicWinnerService : IOlympicWinnerService
{
    private readonly HttpClient _httpClient;

    public OlympicWinnerService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IEnumerable<string>> GetSportAsync()
    {
        return (await _httpClient.GetFromJsonAsync<IEnumerable<string>>("OlympicWinner/GetSport"))!;
    }
}