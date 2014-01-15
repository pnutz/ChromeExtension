//Helper functions
function formToJSONKeyMap(formId)
{
  var o = {};
  var a = $(formId).serializeArray();
  $.each(a, function() 
  {
    console.log(this.name);
    if (o[this.name] !== undefined) 
    {
      console.log(this.name + "defined");
      if (!o[this.name].push) 
      {
        console.log(this.name + "not pushed");
        o[this.name] = [o[this.name]];
      }
      console.log(this.name + "pushing");
      o[this.name].push(this.value || '');
    } 
    else 
    {
      console.log(this.name + "not defined");
      o[this.name] = this.value || '';
    }
  });
  return o;
}
