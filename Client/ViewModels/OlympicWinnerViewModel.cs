using BlazorAppWasmLab.Client.Components;
using BlazorAppWasmLab.Client.Interfaces;

namespace BlazorAppWasmLab.Client.ViewModels;

public class OlympicWinnerViewModel
{
    private readonly IOlympicWinnerService _olympicWinnerService;
    private IRazorPage _page = default!;
    private IEnumerable<string>? _selectedSports = Enumerable.Empty<string>();

    public OlympicWinnerViewModel(IOlympicWinnerService olympicWinnerService)
    {
        _olympicWinnerService = olympicWinnerService;
    }

    public IEnumerable<string> Sports { get; set; } = Enumerable.Empty<string>();

    public IEnumerable<string> SelectedSports
    {
        // when clear all items by x button, the value will be null
        get => _selectedSports ?? Enumerable.Empty<string>();
        set => _selectedSports = value;
    }

    public OlympicWinnerChartComponent ChartComponent
    {
        set => ChartComponents.Add(value);
    }

    public List<OlympicWinnerChartComponent> ChartComponents { get; } = new();
    public CancellationTokenSource CancellationTokenSource { get; } = new();

    public void Setup(IRazorPage page)
    {
        _page = page;
    }

    public async Task RenderChartAsync()
    {
        Sports = await _olympicWinnerService.GetSportAsync();
        SelectedSports = Sports;
        await _page.NeedRefreshAsync();
        foreach (var chart in ChartComponents)
        {
            var data = await _olympicWinnerService.GetWinnerAsync(chart.SportName ?? "");
            if (!CancellationTokenSource.Token.IsCancellationRequested)
            {
                await chart.Render(data);
            }
        }
    }
}