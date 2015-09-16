var string = "{";
var regExpMetaCharacters = /* Replace this: */ /\S/g /* with your regexp */;
var replacement = '\\$&';

string.replace(regExpMetaCharacters, replacement);
