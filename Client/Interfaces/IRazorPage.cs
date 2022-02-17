namespace BlazorAppWasmLab.Client.Interfaces;

public interface IRazorPage
{
    Task NeedRefreshAsync();
    Task NeedInvokeAsync(Action action);
}