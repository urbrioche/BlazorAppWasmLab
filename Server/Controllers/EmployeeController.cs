using Microsoft.AspNetCore.Mvc;

namespace BlazorAppWasmLab.Server.Controllers
{
    [Route("[controller]/[action]")]
    [ApiController]
    public class EmployeeController : ControllerBase
    {
        public IEnumerable<EmployeeSummary> GetEmployeeSummary()
        {
            return new EmployeeSummary[]
            {
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2010",
                    NumberOfEmployee = 43934,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2011",
                    NumberOfEmployee = 52503,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2012",
                    NumberOfEmployee = 57177,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2013",
                    NumberOfEmployee = 69658,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2014",
                    NumberOfEmployee = 97031,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2015",
                    NumberOfEmployee = 119931,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2016",
                    NumberOfEmployee = 137133,
                },
                new EmployeeSummary()
                {
                    Sector = "Installation",
                    Year = "2017",
                    NumberOfEmployee = 154175,
                },
                
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2010",
                    NumberOfEmployee = 24916,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2011",
                    NumberOfEmployee = 24064,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2012",
                    NumberOfEmployee = 29742,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2013",
                    NumberOfEmployee = 29851,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2014",
                    NumberOfEmployee = 32490,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2015",
                    NumberOfEmployee = 30282,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2016",
                    NumberOfEmployee = 38121,
                },
                new EmployeeSummary()
                {
                    Sector = "Manufacturing",
                    Year = "2017",
                    NumberOfEmployee = 40434,
                },
                
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2010",
                    NumberOfEmployee = 11744,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2011",
                    NumberOfEmployee = 17722,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2012",
                    NumberOfEmployee = 16005,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2013",
                    NumberOfEmployee = 19771,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2014",
                    NumberOfEmployee = 20185,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2015",
                    NumberOfEmployee = 24377,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2016",
                    NumberOfEmployee = 32147,
                },
                new EmployeeSummary()
                {
                    Sector = "Sales & Distribution",
                    Year = "2017",
                    NumberOfEmployee = 39387,
                },
                
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2010",
                    NumberOfEmployee = null,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2011",
                    NumberOfEmployee = null,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2012",
                    NumberOfEmployee = 7988,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2013",
                    NumberOfEmployee = 12169,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2014",
                    NumberOfEmployee = 15112,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2015",
                    NumberOfEmployee = 22452,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2016",
                    NumberOfEmployee = 34400,
                },
                new EmployeeSummary()
                {
                    Sector = "Project Development",
                    Year = "2017",
                    NumberOfEmployee = 34227,
                },
                
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2010",
                    NumberOfEmployee = 12908,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2011",
                    NumberOfEmployee = 5948,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2012",
                    NumberOfEmployee = 8105,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2013",
                    NumberOfEmployee = 11248,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2014",
                    NumberOfEmployee = 8989,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2015",
                    NumberOfEmployee = 11816,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2016",
                    NumberOfEmployee = 18274,
                },
                new EmployeeSummary()
                {
                    Sector = "Other",
                    Year = "2017",
                    NumberOfEmployee = 18111,
                },
                
                
            };
        }
    }

    public class EmployeeSummary
    {
        public string? Sector { get; set; }
        public string? Year { get; set; }
        public int? NumberOfEmployee { get; set; }
    }
}