using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using BlazorAppWasmLab.Client;
using BlazorAppWasmLab.Client.Services;
using BlazorAppWasmLab.Client.ViewModels;
using Blazored.Modal;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<IMyNoteService, MyNoteService>();
builder.Services.AddScoped<MyNotesViewModel>();
builder.Services.AddScoped<GameViewModel>();
builder.Services.AddScoped<GameAdvanceViewModel>();
builder.Services.AddBlazoredModal();

await builder.Build().RunAsync();
