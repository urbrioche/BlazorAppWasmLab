using BlazorAppWasmLab.Client.Services;

namespace BlazorAppWasmLab.Client.Interfaces;

public interface IEmployeeSummaryService
{
    Task<IEnumerable<EmployeeSummary>> GetDataAsync();
}