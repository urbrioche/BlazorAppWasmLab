using System.ComponentModel.DataAnnotations;

namespace BlazorAppWasmLab.Shared;

public class MyNote : ICloneable
{
    public int Id { get; set; }
    [Required(ErrorMessage = "事項不可為空白")]
    public string Title { get; set; }

    public MyNote Clone()
    {
        return (((ICloneable)this).Clone() as MyNote)!;
    }

    object ICloneable.Clone()
    {
        return MemberwiseClone();
    }
}