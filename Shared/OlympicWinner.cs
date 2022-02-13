namespace BlazorAppWasmLab.Shared;

public class OlympicWinner
{
    public int Id { get; set; }
    public string? Athlete { get; set; }
    public int? Age { get; set; }
    public string? Country { get; set; }

    public int? Year { get; set; }

    public DateTime? Date { get; set; }

    public string? Sport { get; set; }

    public int Gold { get; set; }

    public int Silver { get; set; }

    public int Bronze { get; set; }

    public int Total { get; set; }
}