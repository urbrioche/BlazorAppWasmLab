using System.ComponentModel.DataAnnotations;

namespace BlazorAppWasmLab.Client.Models;

public class MyNote : ICloneable
{
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