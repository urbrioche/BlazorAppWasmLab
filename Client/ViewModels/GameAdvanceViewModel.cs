using BlazorAppWasmLab.Client.Interfaces;

namespace BlazorAppWasmLab.Client.ViewModels;

public class GameAdvanceViewModel
{
    private readonly GameItem _paper;
    private readonly GameItem _rock;
    private readonly GameItem _scissors;
    private IRazorPage _view = null!;
    private CancellationTokenSource _cancellationTokenSource = new();

    public GameAdvanceViewModel()
    {
        var empty = new GameItem {Name = "Empty",};
        _scissors = new GameItem {Name = "Scissors",};
        _rock = new GameItem {Name = "Rock",};
        _paper = new GameItem {Name = "Paper",};
        AllItems = new List<GameItem>
        {
            empty,
            _scissors,
            _rock,
            _paper,
        };
        You = empty;
        Computer = empty;
    }

    public List<GameItem> AllItems { get; set; }
    public GameItem You { get; set; }
    public GameItem Computer { get; set; }
    public GameStatus GameStatus { get; set; } = GameStatus.Start;
    public string? GameMessage { get; set; }

    public void Choose(GameItem item)
    {
        if (GameStatus != GameStatus.Run)
        {
            return;
        }

        _cancellationTokenSource.Cancel();
        GameStatus = GameStatus.Restart;
        item.Selected = true;
        AllItems.ForEach(x =>
        {
            if (x != item)
            {
                x.Selected = false;
            }
        });
        You = item;

        CheckResult();
    }

    private void CheckResult()
    {
        var winState = new HashSet<(GameItem, GameItem)>()
        {
            (_rock, _scissors),
            (_scissors, _paper),
            (_paper, _rock),
        };

        if (You == Computer)
        {
            GameMessage = "平手";
        }
        // else if ((You == _rock && Computer == _scissors) ||
        //          (You == _scissors && Computer == _paper) ||
        //          (You == _paper && Computer == _rock))
        else if (winState.Contains((You, Computer)))
        {
            GameMessage = "你贏了，想要再來一次嗎？";
        }
        else
        {
            GameMessage = "你輸了，想要再來一次嗎？";
        }
    }

    public void Setup(IRazorPage view)
    {
        _view = view;
    }

    public void Start()
    {
        Play();
    }

    private void Play()
    {
        Reset();
        GameMessage = "請選擇 剪刀 石頭 布";
        _cancellationTokenSource = new CancellationTokenSource();
        Task.Run(async () =>
        {
            var random = new Random();
            while (true)
            {
                if (!_cancellationTokenSource.Token.IsCancellationRequested)
                {
                    var count = random.Next(20, 35);

                    Computer = AllItems[count % 3 + 1];
                    await _view.NeedRefreshAsync();
                    await Task.Delay(100, _cancellationTokenSource.Token);
                }
                else
                {
                    break;
                }
            }
        });

        GameStatus = GameStatus.Run;
    }

    private void Reset()
    {
        GameMessage = "";
        _rock.Selected = false;
        _paper.Selected = false;
        _scissors.Selected = false;
    }

    public void Restart()
    {
        Play();
    }
}