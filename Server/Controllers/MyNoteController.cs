using BlazorAppWasmLab.Server.Models;
using BlazorAppWasmLab.Shared;
using Microsoft.AspNetCore.Mvc;

namespace BlazorAppWasmLab.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class MyNoteController : ControllerBase
    {
        private readonly MyNoteDbContext _myNoteDbContext;

        public MyNoteController(MyNoteDbContext myNoteDbContext)
        {
            _myNoteDbContext = myNoteDbContext;
        }

        [HttpGet]
        public IEnumerable<MyNote> Get()
        {
            return _myNoteDbContext.MyNotes.ToList();
        }

        [HttpPost]
        public void Post([FromBody] MyNote myNote)
        {
            _myNoteDbContext.MyNotes.Add(myNote);
            _myNoteDbContext.SaveChanges();
        }

        [HttpDelete("{id}")]
        public void Delete(int id)
        {
            var item = _myNoteDbContext.MyNotes.FirstOrDefault(x => x.Id == id);
            if (item != null)
            {
                _myNoteDbContext.MyNotes.Remove(item);
                _myNoteDbContext.SaveChanges();
            }
        }
        
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] MyNote myNote)
        {
            var item = _myNoteDbContext.MyNotes.FirstOrDefault(x => x.Id == id);
            if (item != null)
            {
                item.Title = myNote.Title;
                _myNoteDbContext.SaveChanges();
            }
        }
    }
}
