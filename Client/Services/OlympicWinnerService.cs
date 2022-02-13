using System.Net.Http.Json;
using BlazorAppWasmLab.Client.Interfaces;
using BlazorAppWasmLab.Shared;

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

    public async Task<IEnumerable<OlympicWinner>> GetWinnerAsync(string sport)
    {
        return (await _httpClient.GetFromJsonAsync<IEnumerable<OlympicWinner>>(
            $"OlympicWinner/GetWinner?sport={sport}"))!;
    }
}