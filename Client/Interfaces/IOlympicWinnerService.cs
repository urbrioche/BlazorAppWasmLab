using BlazorAppWasmLab.Client.Pages;
using BlazorAppWasmLab.Shared;

namespace BlazorAppWasmLab.Client.Interfaces;

public interface IOlympicWinnerService
{
    Task<IEnumerable<string>> GetSportAsync();
    Task<IEnumerable<OlympicWinner>> GetWinnerAsync(string sport);
}