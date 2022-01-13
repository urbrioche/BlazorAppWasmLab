namespace BlazorAppWasmLab.Client.ViewModels;

public class GameItem
{
    public string? Name { get; set; }

    public string Image => $"Images/{Name}.png";

    public string BackGround
    {
        get
        {
            if (Selected)
            {
                return "bg-secondary";
            }

            return string.Empty;
        }
    }

    public bool Selected { get; set; }
}