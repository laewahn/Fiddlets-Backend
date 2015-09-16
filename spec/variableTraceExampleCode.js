var string = "{";
var regExpMetaCharacters = /* Replace this: */ /\S/g /* with your regexp */;
var replacement = '\\$&';
string = "foo bar";

var  anArray = [];
anArray.push("hello");

string.replace(regExpMetaCharacters, replacement);
