using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlazorAppWasmLab.Server.Models;
using BlazorAppWasmLab.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BlazorAppWasmLab.Server.Controllers
{
    [Route("[controller]/[action]")]
    [ApiController]
    public class OlympicWinnerController : ControllerBase
    {
        private readonly OlympicWinnerDbContext _dbContext;

        public OlympicWinnerController(OlympicWinnerDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<string?>> GetSport()
        {
            return await _dbContext.OlympicWinners
                .Select(x => x.Sport)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();
        }

        public async Task<IEnumerable<OlympicWinner>> GetWinner(string sport)
        {
            return await _dbContext.OlympicWinners
                .Where(x => x.Sport == sport)
                .ToListAsync();
        }
    }
}