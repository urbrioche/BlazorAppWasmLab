namespace BlazorAppWasmLab.Client.Interfaces;

public interface IOlympicWinnerService
{
    Task<IEnumerable<string>> GetSportAsync();
}