using System.Net.Http.Json;
using BlazorAppWasmLab.Client.Interfaces;

namespace BlazorAppWasmLab.Client.Services;

public class EmployeeSummaryService : IEmployeeSummaryService
{
    private readonly HttpClient _httpClient;

    public EmployeeSummaryService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IEnumerable<EmployeeSummary>> GetDataAsync()
    {
        return await _httpClient.GetFromJsonAsync<List<EmployeeSummary>>("Employee/GetEmployeeSummary") ??
               new List<EmployeeSummary>();
    }
}

public class EmployeeSummary
{
    public string? Sector { get; set; }
    public string? Year { get; set; }
    public int? NumberOfEmployee { get; set; }
}