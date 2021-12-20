using BlazorAppWasmLab.Client.Models;

namespace BlazorAppWasmLab.Client.Services;

public class MyNoteService : IMyNoteService
{
    public List<MyNote> MyNotes { get; set; }

    public MyNoteService()
    {
        MyNotes = new List<MyNote>()
        {
            new() { Title = "買芭樂", },
            new() { Title = "買蘋果", },
            new() { Title = "買西瓜", },
        };
    }

    public Task CreateAsync(MyNote myNote)
    {
        MyNotes.Add(myNote);

        return Task.FromResult(0);
    }

    public Task DeleteAsync(MyNote myNote)
    {
        MyNotes.Remove(MyNotes.FirstOrDefault(x => x.Title == myNote.Title));
        return Task.FromResult(0);
    }

    public Task<List<MyNote>> RetrieveAsync()
    {
        return Task.FromResult(MyNotes);
    }

    public Task UpdateAsync(MyNote origMyNote, MyNote myNote)
    {
        MyNotes.FirstOrDefault(x => x.Title == origMyNote.Title).Title = myNote.Title;
        return Task.FromResult(0);
    }
}