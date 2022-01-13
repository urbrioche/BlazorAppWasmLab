using BlazorAppWasmLab.Client.Interfaces;

namespace BlazorAppWasmLab.Client.ViewModels;

public class GameViewModel
{
    private IRazorPage _view = null!;

    public GameViewModel()
    {
        AllItems = new List<GameItem>
        {
            new() {Name = "Empty",},
            new() {Name = "Scissors",},
            new() {Name = "Rock",},
            new() {Name = "Paper",},
        };
        You = AllItems[0];
        Computer = AllItems[0];
    }

    public List<GameItem> AllItems { get; set; }
    public GameItem You { get; set; }
    public GameItem Computer { get; set; }

    public async Task Choose(GameItem item)
    {
        item.Selected = true;
        AllItems.ForEach(x =>
        {
            if (x != item)
            {
                x.Selected = false;
            }
        });
        You = item;

        var random = new Random();
        var count = random.Next(20, 35);

        for (var i = 0; i < count; i++)
        {
            Computer = AllItems[i % 3 + 1];
            await Task.Delay(100);
            await _view.NeedRefreshAsync();
        }
    }

    public void Setup(IRazorPage view)
    {
        _view = view;
    }
}