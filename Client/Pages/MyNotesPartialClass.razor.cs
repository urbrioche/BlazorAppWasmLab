using BlazorAppWasmLab.Client.Services;
using BlazorAppWasmLab.Shared;
using Blazored.Modal;
using Blazored.Modal.Services;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorAppWasmLab.Client.Pages;

public partial class MyNotesPartialClass : IAsyncDisposable
{
    [Inject] public IJSRuntime JsRuntime { get; set; } = null!;

    [Inject] public IMyNoteService MyNoteService { get; set; } = null!;

    private List<MyNote> Notes { get; set; } = new();
    private MyNote CurrentMyNote { get; set; } = new();
    private MyNote OrigMyNote { get; set; } = new();
    private bool IsNewMode { get; set; }
    private string DialogId { get; set; } = "myModal";
    [CascadingParameter] public IModalService Modal { get; set; } = null!;
    private IJSObjectReference _module = null!;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            _module = await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./scripts/modalHelper.js");
        }
    }

    protected override async Task OnInitializedAsync()
    {
        Notes = await MyNoteService.RetrieveAsync();
    }

    private async Task Delete(MyNote noteItem)
    {
        var parameters = new ModalParameters();
        parameters.Add("RecordTitleName", noteItem.Title);
        var confirm = Modal.Show<ConfirmDelete>("確定要刪除嗎?", parameters);
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
            StateHasChanged();
        }
    }

    private async Task Add()
    {
        IsNewMode = true;
        CurrentMyNote = new MyNote();
        await OpenDialog();
    }

    private async Task Update(MyNote noteItem)
    {
        IsNewMode = false;
        CurrentMyNote = OrigMyNote = noteItem.Clone();
        CurrentMyNote = noteItem.Clone();
        OrigMyNote = noteItem;
        await OpenDialog();
    }

    private async Task HandleValidSubmit()
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
        StateHasChanged();
    }

    private async Task CloseDialog()
    {
        await _module.InvokeVoidAsync("closeModal", DialogId);
    }

    private async Task OpenDialog()
    {
        await _module.InvokeVoidAsync("showModal", DialogId);
    }

    public async ValueTask DisposeAsync()
    {
        await _module.DisposeAsync();
    }
}