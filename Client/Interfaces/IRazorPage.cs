using Blazored.Modal.Services;

namespace BlazorAppWasmLab.Client.Interfaces;

public interface IRazorPage
{
    // reference: https://github.com/vulcanlee/Blazor-Xamarin-Full-Stack-HOL/blob/main/Src/BusinessNET6/Backend/Interfaces/IRazorPage.cs
    Task NeedRefreshAsync();
    // add additional one
    IModalService Modal { get; set; }
}