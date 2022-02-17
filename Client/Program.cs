using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using BlazorAppWasmLab.Client;
using BlazorAppWasmLab.Client.Interfaces;
using BlazorAppWasmLab.Client.Services;
using BlazorAppWasmLab.Client.ViewModels;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient {BaseAddress = new Uri(builder.HostEnvironment.BaseAddress)});
builder.Services.AddScoped<IOlympicWinnerService, OlympicWinnerService>();
builder.Services.AddScoped<OlympicWinnerViewModel>();

await builder.Build().RunAsync();