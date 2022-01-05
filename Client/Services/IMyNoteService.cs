using BlazorAppWasmLab.Shared;

namespace BlazorAppWasmLab.Client.Services;

public interface IMyNoteService
{
    Task CreateAsync(MyNote myNote);
    Task DeleteAsync(MyNote myNote);
    Task<List<MyNote>> RetrieveAsync();
    Task UpdateAsync(MyNote origMyNote, MyNote myNote);
}