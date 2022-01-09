using BlazorAppWasmLab.Client.Interfaces;
using BlazorAppWasmLab.Client.Pages;
using BlazorAppWasmLab.Client.Services;
using BlazorAppWasmLab.Shared;
using Blazored.Modal;
using Microsoft.JSInterop;

namespace BlazorAppWasmLab.Client.ViewModels;

public class MyNotesViewModel
{
    private readonly IJSRuntime _jsRuntime;
    public List<MyNote> Notes { get; set; } = new();
    public MyNote CurrentMyNote { get; set; } = new();
    private MyNote OrigMyNote { get; set; } = new();
    private bool IsNewMode { get; set; }
    public string DialogId { get; set; } = "myModal";
    // [CascadingParameter] public IModalService Modal { get; set; } = null!;

    public IJSObjectReference JsModule = null!;
    private IRazorPage _razorPage = null!;

    private IMyNoteService MyNoteService { get; }

    public MyNotesViewModel(IMyNoteService myNoteService, IJSRuntime jsRuntime)
    {
        _jsRuntime = jsRuntime;
        MyNoteService = myNoteService;
    }

    public async Task Setup(IRazorPage razorPage)
    {
        _razorPage = razorPage;
        JsModule = await _jsRuntime.InvokeAsync<IJSObjectReference>("import", "./scripts/modalHelper.js");
    }
    
    public async Task ReloadAsync()
    {
        Notes = await MyNoteService.RetrieveAsync();
    }
    
    public async Task Delete(MyNote noteItem)
    {
        var parameters = new ModalParameters();
        parameters.Add("RecordTitleName", noteItem.Title);
        var confirm = _razorPage.Modal.Show<ConfirmDelete>("確定要刪除嗎?", parameters);
        var result = await confirm.Result;
        if (result.Cancelled)
        {
            Console.WriteLine("Modal was cancelled");
        }
        else
        {
            Console.WriteLine(result.Data.ToString());
            await MyNoteService.DeleteAsync(noteItem);
            Notes = await MyNoteService.RetrieveAsync();
            
        }
    }

    public async Task Add()
    {
        IsNewMode = true;
        CurrentMyNote = new MyNote();
        await OpenDialog();
    }

    public async Task Update(MyNote noteItem)
    {
        IsNewMode = false;
        CurrentMyNote = OrigMyNote = noteItem.Clone();
        CurrentMyNote = noteItem.Clone();
        OrigMyNote = noteItem;
        await OpenDialog();
    }

    public async Task HandleValidSubmit()
    {
        await CloseDialog();
        if (IsNewMode)
        {
            await MyNoteService.CreateAsync(CurrentMyNote);
        }
        else
        {
            await MyNoteService.UpdateAsync(OrigMyNote, CurrentMyNote);
        }

        Notes = await MyNoteService.RetrieveAsync();
        await _razorPage.NeedRefreshAsync();
    }

    public async Task CloseDialog()
    {
        await JsModule.InvokeVoidAsync("closeModal", DialogId);
    }

    private async Task OpenDialog()
    {
        await JsModule.InvokeVoidAsync("showModal", DialogId);
    }

    // public async ValueTask DisposeAsync()
    // {
    //     await _module.DisposeAsync();
    // }
}