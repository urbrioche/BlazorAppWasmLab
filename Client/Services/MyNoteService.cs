using System.Net.Http.Json;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using BlazorAppWasmLab.Shared;

namespace BlazorAppWasmLab.Client.Services;

public class MyNoteService : IMyNoteService
{
    private readonly HttpClient _httpClient;

    public MyNoteService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task CreateAsync(MyNote myNote)
    {
        await _httpClient.PostAsync("MyNote",
            new StringContent(JsonSerializer.Serialize(myNote),
                Encoding.UTF8, MediaTypeNames.Application.Json)
        );
    }

    public async Task DeleteAsync(MyNote myNote)
    {
        await _httpClient.DeleteAsync($"MyNote/{myNote.Id}");
    }

    public async Task<List<MyNote>?> RetrieveAsync()
    {
        return await _httpClient.GetFromJsonAsync<List<MyNote>>("MyNote");
    }

    public async Task UpdateAsync(MyNote origMyNote, MyNote myNote)
    {
        await _httpClient.PutAsync($"MyNote/{myNote.Id}",
            new StringContent(JsonSerializer.Serialize(myNote),
                Encoding.UTF8, MediaTypeNames.Application.Json)
        );
    }
}